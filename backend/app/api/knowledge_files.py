"""知识库文件管理 API"""
import uuid
import aiohttp
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.knowledge_config import KnowledgeConfig
from app.models.knowledge_file import KnowledgeFile

router = APIRouter()


@router.get("/knowledge/files")
async def list_knowledge_files(
    db: Annotated[AsyncSession, Depends(get_db)],
    knowledge_config_id: uuid.UUID | None = None,
):
    """
    获取知识库文件列表

    如果指定了 knowledge_config_id，则从对应的 Dify 知识库获取文件列表
    否则从默认知识库获取
    """
    # 获取知识库配置
    config = await _get_knowledge_config(db, knowledge_config_id)

    # 调用 Dify API 获取文件列表
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/datasets/{config.knowledge_id}/documents"
            headers = {
                "Authorization": f"Bearer {config.dify_api_key}",
            }

            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"获取文件列表失败: {error_text}"
                    )

                data = await response.json()
                items = data.get("data", [])
                
                # 从数据库获取文件大小信息
                result = await db.execute(
                    select(KnowledgeFile).where(
                        KnowledgeFile.knowledge_config_id == config.id
                    )
                )
                file_records = {fr.dify_document_id: fr for fr in result.scalars().all()}
                
                # 为每个选项补充 size 字段
                for item in items:
                    doc_id = item.get("id")
                    if doc_id and doc_id in file_records:
                        item["size"] = file_records[doc_id].size
                    else:
                        item["size"] = None
                
                return {
                    "items": items,
                    "total": len(items),
                }

    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


@router.post("/knowledge/files/upload")
async def upload_knowledge_file(
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    knowledge_config_id: uuid.UUID | None = None,
):
    """
    上传文件到知识库
    """
    # 获取知识库配置
    config = await _get_knowledge_config(db, knowledge_config_id)

    # 调用 Dify API 上传文件
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/datasets/{config.knowledge_id}/document/create_by_file"

            # 获取原始文件名（FastAPI 已经正确解码了 multipart 中的 filename）
            raw_filename = file.filename or 'upload'
            
            # 获取文件大小
            file_size = 0
            file_content = await file.read()
            file_size = len(file_content)

            # 准备表单数据
            # 关键：aiohttp.FormData 在处理非 ASCII filename 时会进行 percent-encode
            # 但 Dify 接收后不解码，导致显示的是编码后的字符串
            # 解决方案：使用 quote_fields=False 禁止自动编码
            form_data = aiohttp.FormData(quote_fields=False)
            form_data.add_field(
                'file',
                file_content,
                filename=raw_filename,
                content_type=file.content_type
            )
            form_data.add_field('data', '{"indexing_technique":"high_quality","process_rule":{"mode":"automatic"}}')

            headers = {
                "Authorization": f"Bearer {config.dify_api_key}",
            }

            async with session.post(url, data=form_data, headers=headers) as response:
                if response.status not in (200, 201):
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"上传文件失败: {error_text}"
                    )

                data = await response.json()
                
                # 保存到数据库
                if data and 'document' in data:
                    doc = data['document']
                    knowledge_file = KnowledgeFile(
                        dify_document_id=doc['id'],
                        knowledge_config_id=config.id,
                        name=doc.get('name', raw_filename),
                        size=file_size,
                        word_count=doc.get('word_count'),
                    )
                    db.add(knowledge_file)
                    await db.commit()
                
                return data

    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


@router.delete("/knowledge/files/{file_id}")
async def delete_knowledge_file(
    file_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    knowledge_config_id: uuid.UUID | None = None,
):
    """
    从知识库删除文件
    """
    # 获取知识库配置
    config = await _get_knowledge_config(db, knowledge_config_id)

    # 调用 Dify API 删除文件
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/datasets/{config.knowledge_id}/documents/{file_id}"
            headers = {
                "Authorization": f"Bearer {config.dify_api_key}",
            }

            async with session.delete(url, headers=headers) as response:
                if response.status not in (200, 204):
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"删除文件失败: {error_text}"
                    )
                
                # 删除数据库记录
                result = await db.execute(
                    select(KnowledgeFile).where(
                        KnowledgeFile.dify_document_id == file_id
                    )
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
):
    """
    搜索知识库文件
    """
    # 获取知识库配置
    config = await _get_knowledge_config(db, knowledge_config_id)

    # 调用 Dify API 搜索文件
    try:
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/datasets/{config.knowledge_id}/documents"
            headers = {
                "Authorization": f"Bearer {config.dify_api_key}",
            }
            params = {
                "keyword": q,
            }

            async with session.get(url, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"搜索文件失败: {error_text}"
                    )

                data = await response.json()
                # 过滤搜索结果
                items = data.get("data", [])
                filtered_items = [item for item in items if q.lower() in item.get("name", "").lower()]

                return {
                    "items": filtered_items,
                    "total": len(filtered_items),
                }

    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"连接 Dify 失败: {str(e)}")


async def _get_knowledge_config(
    db: AsyncSession,
    config_id: uuid.UUID | None = None,
) -> KnowledgeConfig:
    """
    获取知识库配置

    如果指定了 config_id，则获取对应的配置
    否则获取默认配置
    """
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
