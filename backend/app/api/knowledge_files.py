"""知识库文件管理 API"""
import uuid
import aiohttp
from aiohttp import FormData
import os
from pathlib import Path
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.knowledge_config import KnowledgeConfig
from app.models.knowledge_file import KnowledgeFile

# 本地文件存储目录
UPLOAD_DIR = Path("uploads/knowledge_files")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()


def _console_url(config: KnowledgeConfig, path: str) -> str:
    """
    构建 Dify Console API URL（/console/api 前缀）
    注意：Dify App API 的 base_url 通常带 /v1 前缀，但 Console API 不带 /v1，
    所以需要去掉 /v1 再拼接 /console/api 路径。
    """
    base = config.dify_base_url.rstrip("/").replace("/v1", "", 1)
    return f"{base}/console/api{path}"


@router.get("/knowledge/files")
async def list_knowledge_files(
    db: Annotated[AsyncSession, Depends(get_db)],
    knowledge_config_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量，最大 100"),
):
    """获取知识库文件列表（支持分页）"""
    config = await _get_knowledge_config(db, knowledge_config_id)

    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/documents"
            headers = {"Authorization": f"Bearer {config.dify_api_key}"}

            # Dify API 默认 limit=20，需要循环获取全部数据
            all_items: list = []
            dify_page = 1
            dify_limit = 100  # 每次 Dify API 请求最多获取 100 条
            while True:
                params = {"page": dify_page, "limit": dify_limit}
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"获取文件列表失败: {await response.text()}"
                        )
                    data = await response.json()
                items = data.get("data", [])
                all_items.extend(items)
                # has_more=False 或返回数据为空时停止
                if not data.get("has_more", False) or len(items) == 0:
                    break
                dify_page += 1

            # 补充 size（从数据库查）
            result = await db.execute(
                select(KnowledgeFile).where(
                    KnowledgeFile.knowledge_config_id == config.id
                )
            )
            file_records = {fr.dify_document_id: fr for fr in result.scalars().all()}
            for item in all_items:
                doc_id = item.get("id")
                if doc_id and doc_id in file_records:
                    item["size"] = file_records[doc_id].size
                else:
                    item["size"] = None

            total = len(all_items)
            # 计算分页
            start = (page - 1) * page_size
            end = start + page_size
            items = all_items[start:end]

            return {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
            }

    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


@router.post("/knowledge/files/upload")
async def upload_knowledge_file(
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    knowledge_config_id: uuid.UUID | None = None,
):
    """上传文件到 Dify 知识库，并保存到本地"""
    config = await _get_knowledge_config(db, knowledge_config_id)
    raw_filename = file.filename or "upload"
    file_content = await file.read()
    file_size = len(file_content)
    
    # 保存文件到本地
    file_ext = Path(raw_filename).suffix
    local_filename = f"{uuid.uuid4()}{file_ext}"
    local_path = UPLOAD_DIR / local_filename
    
    with open(local_path, "wb") as f:
        f.write(file_content)

    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/document/create_by_file"
            # form_data = aiohttp.FormData(quote_fields=False)
            form_data = FormData()
            form_data.add_field(
                "file", file_content,
                filename=raw_filename,
                content_type=file.content_type or "application/octet-stream",
            )

            # 根据配置的索引模式决定上传参数
            # economy: 关键词匹配，无需 Embedding 模型
            # high_quality: 向量检索，需要 Embedding 模型已配置
            indexing_technique = getattr(config, 'indexing_technique', 'economy') or 'economy'
            # form_data.add_field(
            #     "data",
            #     f'{{"indexing_technique":"{indexing_technique}","process_rule":{{"mode":"automatic"}}}}',
            # )
            import json
            form_data.add_field(
                "data",
                json.dumps({
                    "indexing_technique": indexing_technique,
                    "process_rule": {"mode": "automatic"}
                }),
                content_type="application/json"  # 明确指定内容类型
            )

            headers = {"Authorization": f"Bearer {config.dify_api_key}"}

            async with session.post(url, data=form_data, headers=headers) as response:
                if response.status not in (200, 201):
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"上传到 Dify 失败: {await response.text()}",
                    )
                dify_data = await response.json()

        dify_doc = dify_data.get("document", {})
        dify_doc_id = dify_doc.get("id")
        if not dify_doc_id:
            raise HTTPException(status_code=500, detail="Dify 未返回文档 ID")

        knowledge_file = KnowledgeFile(
            dify_document_id=dify_doc_id,
            knowledge_config_id=config.id,
            name=dify_doc.get("name", raw_filename),
            size=file_size,
            word_count=dify_doc.get("word_count"),
            local_path=str(local_path),  # 保存本地路径
        )
        db.add(knowledge_file)
        await db.commit()

        return dify_data

    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


@router.get("/knowledge/files/{file_id}/download")
async def download_knowledge_file(
    file_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    knowledge_config_id: uuid.UUID | None = None,
    disposition: str = Query("attachment", description="inline=预览, attachment=下载"),
):
    """
    从本地文件系统提供文件下载。
    
    优先使用本地保存的文件，如果没有则尝试从 Dify 下载（兼容旧数据）。

    - disposition=inline：让浏览器直接预览（PDF/图片会内联显示）
    - disposition=attachment：强制弹出保存对话框
    """
    # 获取文件信息
    result = await db.execute(
        select(KnowledgeFile).where(KnowledgeFile.dify_document_id == file_id)
    )
    knowledge_file = result.scalar_one_or_none()
    
    if not knowledge_file:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    filename = knowledge_file.name
    
    # 优先从本地文件系统提供文件
    if knowledge_file.local_path and os.path.exists(knowledge_file.local_path):
        local_path = Path(knowledge_file.local_path)
        
        # 确定 media_type
        import mimetypes
        media_type, _ = mimetypes.guess_type(str(local_path))
        if not media_type:
            media_type = "application/octet-stream"
        
        # RFC 5987 编码文件名（支持中文）
        from urllib.parse import quote
        encoded_filename = quote(filename, safe='')
        
        content_disposition = f"{disposition}; filename*=UTF-8''{encoded_filename}"
        
        return FileResponse(
            path=str(local_path),
            filename=filename,
            media_type=media_type,
            headers={
                "Content-Disposition": content_disposition,
            }
        )
    
    # 兼容旧数据：如果没有本地文件，尝试从 Dify 下载
    else:
        config = await _get_knowledge_config(db, knowledge_config_id)
        
        try:
            dify_url = _console_url(
                config,
                f"/datasets/{config.knowledge_id}/documents/{file_id}/download",
            )

            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {config.dify_api_key}",
                }

                async with session.get(dify_url, headers=headers, allow_redirects=True) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Dify 下载失败: {await response.text()}"
                        )

                    content_type = response.headers.get("Content-Type", "application/octet-stream")

                    # 如果 Dify 没返回文件名，用我们数据库里的原始文件名
                    content_disp = response.headers.get("Content-Disposition", "")
                    if "filename" not in content_disp:
                        # RFC 5987 / RFC 2231 编码，确保中文文件名正确
                        from urllib.parse import quote
                        encoded_filename = quote(filename, safe='')
                        content_disp = f"{disposition}; filename*=UTF-8''{encoded_filename}"

                    return StreamingResponse(
                        response.content.iter_any(),
                        media_type=content_type,
                        headers={
                            "Content-Disposition": content_disp,
                            "Content-Length": response.headers.get("Content-Length", ""),
                        },
                    )

        except aiohttp.ClientError as e:
            raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


@router.delete("/knowledge/files/{file_id}")
async def delete_knowledge_file(
    file_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    knowledge_config_id: uuid.UUID | None = None,
):
    """从 Dify 知识库删除文件"""
    config = await _get_knowledge_config(db, knowledge_config_id)

    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/documents/{file_id}"
            headers = {"Authorization": f"Bearer {config.dify_api_key}"}

            async with session.delete(url, headers=headers) as response:
                if response.status not in (200, 204):
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"删除 Dify 文件失败: {await response.text()}",
                    )

        result = await db.execute(
            select(KnowledgeFile).where(KnowledgeFile.dify_document_id == file_id)
        )
        knowledge_file = result.scalar_one_or_none()
        if knowledge_file:
            await db.delete(knowledge_file)
            await db.commit()

        return {"success": True, "message": "文件已删除"}

    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


@router.get("/knowledge/files/search")
async def search_knowledge_files(
    q: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    knowledge_config_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量，最大 100"),
):
    """
    搜索知识库文件（支持分页）。
    
    注意：搜索范围是知识库中的全部内容，先从 Dify 获取所有文件，
    然后按文件名关键词过滤，最后再分页返回结果。
    """
    config = await _get_knowledge_config(db, knowledge_config_id)

    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/documents"
            headers = {"Authorization": f"Bearer {config.dify_api_key}"}

            # Dify API 默认 limit=20，需要循环获取全部数据
            all_items: list = []
            dify_page = 1
            dify_limit = 100
            while True:
                params = {"keyword": q, "page": dify_page, "limit": dify_limit}
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"搜索文件失败: {await response.text()}",
                        )
                    data = await response.json()
                items = data.get("data", [])
                all_items.extend(items)
                if not data.get("has_more", False) or len(items) == 0:
                    break
                dify_page += 1
            
            # 在全部内容中按文件名过滤（不区分大小写）
            filtered_items = [
                item for item in all_items
                if q.lower() in item.get("name", "").lower()
            ]

            total = len(filtered_items)
            # 对搜索结果进行分页
            start = (page - 1) * page_size
            end = start + page_size
            items = filtered_items[start:end]

            return {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
            }

    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


async def _get_knowledge_config(
    db: AsyncSession,
    config_id: uuid.UUID | None = None,
) -> KnowledgeConfig:
    """获取知识库配置"""
    if config_id:
        result = await db.execute(
            select(KnowledgeConfig).where(KnowledgeConfig.id == config_id)
        )
    else:
        result = await db.execute(
            select(KnowledgeConfig).where(KnowledgeConfig.is_default == True)
        )

    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="未找到知识库配置，请先配置知识库")

    return config
