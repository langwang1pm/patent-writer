"""知识库文件管理 API"""
import uuid
import aiohttp
import os
import json
import logging
from pathlib import Path
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from aiohttp import FormData

from app.dependencies import get_db
from app.models.knowledge_config import KnowledgeConfig
from app.models.knowledge_file import KnowledgeFile


def get_dify_knowledge_api_key() -> Optional[str]:
    """获取 Dify 知识库 API Key（从环境变量读取）
    
    知识库操作（上传文档、添加元数据等）需要使用 Dataset API Key
    """
    return os.getenv("DIFY_KNOWLEDGE_API_KEY")


def get_dify_app_api_key() -> Optional[str]:
    """获取 Dify 应用 API Key（从环境变量读取）
    
    调用 Dify 应用（聊天、工作流等）需要使用 App API Key
    """
    return os.getenv("DIFY_API_KEY")


# 本地文件存储目录（支持环境变量配置，Docker 部署时挂载 volume）
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads/knowledge_files"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

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
    enterprise_info_id: str | None = Query(None, description="按企业ID元数据过滤（UUID）"),
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量，最大 100"),
):
    """获取知识库文件列表（支持分页和 enterprise_info_id 元数据过滤）"""
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

            # ========== 按 enterprise_info_id 元数据过滤 ==========
            if enterprise_info_id:
                filtered_items = []
                for item in all_items:
                    # doc_metadata 是数组
                    doc_metadata = item.get("doc_metadata") or []
                    # 找到 company 元数据
                    company_value = None
                    for meta in doc_metadata:
                        if isinstance(meta, dict) and meta.get("name") == "company":
                            company_value = meta.get("value")
                            break
                    # 检查是否匹配
                    if company_value == enterprise_info_id:
                        filtered_items.append(item)
                all_items = filtered_items
            # ==================================================

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
    enterprise_info_id: str | None = Query(None, description="企业ID，用于设置文档元数据"),
):
    logger.info(f"程序走到该方法, enterprise_info_id={enterprise_info_id}")
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
            # form_data = FormData()
            # form_data.add_field(
            #     "file", file_content,
            #     filename=raw_filename,
            #     content_type=file.content_type or "application/octet-stream",
            # )
            #
            # # 根据配置的索引模式决定上传参数
            # # economy: 关键词匹配，无需 Embedding 模型
            # # high_quality: 向量检索，需要 Embedding 模型已配置
            # indexing_technique = getattr(config, 'indexing_technique', 'high_quality') or 'high_quality'
            #
            # # 修改后（建议尝试这种更完整的结构，兼容性强）
            # import json
            # payload = {
            #     "indexing_technique": indexing_technique,
            #     "process_rule": {
            #         "mode": "automatic",
            #         "rules": {
            #             "pre_processing_rules": [
            #                 {"id": "remove_extra_spaces", "enabled": True},
            #                 {"id": "remove_urls_emails", "enabled": False}
            #             ],
            #             "segmentation": {
            #                 "separator": "\n",
            #                 "max_tokens": 500
            #             }
            #         }
            #     }
            # }
            #
            # logger.info(f"准备上传到 Dify: URL={url}, indexing_technique={indexing_technique}, data={data_json}")
            #
            # form_data.add_field(
            #     "data",
            #     json.dumps({
            #         "indexing_technique": indexing_technique,
            #         "process_rule": {"mode": "automatic"}
            #     })
            #     # 不再指定 content_type
            # )
            # headers = {"Authorization": f"Bearer {config.dify_api_key}"}
            #
            # payload_str = json.dumps({
            #     "indexing_technique": indexing_technique,
            #     "process_rule": {"mode": "automatic"}
            # })
            # print(f"DEBUG: Sending to Dify - indexing_technique: {indexing_technique}")
            # print(f"DEBUG: Sending to Dify - data payload: {payload_str}")
            # # print(f"DEBUG: File size being sent: {len(file_content)}")
            #
            # form_data.add_field("data", payload_str)

            # 根据配置的索引模式决定上传参数
            indexing_technique = getattr(config, 'indexing_technique', 'high_quality') or 'high_quality'

            # 构建 data 参数
            data_payload = {
                "indexing_technique": indexing_technique,
                "process_rule": {"mode": "automatic"}
            }
            data_json = json.dumps(data_payload)

            # 构建 form data - 关键：设置 quote_fields=False 避免中文文件名被编码
            form_data = FormData(quote_fields=False)
            form_data.add_field(
                "file", file_content,
                filename=raw_filename,
                content_type=file.content_type or "application/octet-stream",
            )
            form_data.add_field("data", data_json)

            # 知识库操作需要使用 Dataset API Key
            api_key = get_dify_knowledge_api_key() or config.dify_api_key
            if not api_key:
                raise Exception("未配置 Dify 知识库 API Key，请在 .env 中设置 DIFY_KNOWLEDGE_API_KEY")
            headers = {"Authorization": f"Bearer {api_key}"}

            logger.info(f"准备上传到 Dify: URL={url}, indexing_technique={indexing_technique}, data={data_json}")


            async with session.post(url, data=form_data, headers=headers) as response:
                response_text = await response.text()
                logger.info(f"Dify 响应：status={response.status}, body={response_text}")

                if response.status not in (200, 201):
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"上传到 Dify 失败：{response_text}",
                    )
                dify_data = await response.json()

                # 先提取 dify_doc_id
                dify_doc = dify_data.get("document", {})
                dify_doc_id = dify_doc.get("id")
                if not dify_doc_id:
                    raise HTTPException(status_code=500, detail="Dify 未返回文档 ID")

                # 上传成功后，如果有 enterprise_info_id，则添加元数据
                logger.info(f"检查是否需要添加元数据: enterprise_info_id={enterprise_info_id}")
                if enterprise_info_id:
                    logger.info(f"开始为文档 {dify_doc_id} 添加元数据 company={enterprise_info_id}")
                    try:
                        await _add_document_metadata(
                            session, config, dify_doc_id, enterprise_info_id
                        )
                        logger.info(f"✅ 成功为文档 {dify_doc_id} 添加元数据 company={enterprise_info_id}")
                    except Exception as meta_e:
                        # 元数据添加失败不中断主流程，只记录日志
                        logger.error(f"❌ 为文档 {dify_doc_id} 添加元数据失败: {meta_e}")
                else:
                    logger.warning(f"⚠️ 未提供 enterprise_info_id，跳过元数据添加")

        # 此时 dify_doc 和 dify_doc_id 已经在上面定义好了

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

            # 导入 timeout 类 (如果文件头部没有，需在顶部添加: from aiohttp import ClientTimeout)
            timeout = aiohttp.ClientTimeout(total=300)  # 设置总超时为 300 秒 (5分钟)，给 Embedding 足够的时间

            async with aiohttp.ClientSession(timeout=timeout) as session:
                # 知识库操作需要使用 Dataset API Key
                api_key = get_dify_knowledge_api_key() or config.dify_api_key
                if not api_key:
                    raise Exception("未配置 Dify 知识库 API Key，请在 .env 中设置 DIFY_KNOWLEDGE_API_KEY")
                
                headers = {
                    "Authorization": f"Bearer {api_key}",
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
            # 添加详细日志，区分是超时还是连接拒绝
            import traceback
            print(f"=== Dify 请求失败详细日志 ===")
            print(f"错误类型: {type(e).__name__}")
            print(f"错误信息: {str(e)}")
            print(f"堆栈跟踪: {traceback.format_exc()}")
            print(f"==========================")

            # 如果是超时，给出更友好的提示
            if isinstance(e, aiohttp.ClientTimeout):
                raise HTTPException(status_code=504,
                                    detail="上传超时：文件较大或 Embedding 模型处理较慢，请稍后重试或检查 Dify 服务状态")

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
        # 知识库操作需要使用 Dataset API Key
        api_key = get_dify_knowledge_api_key() or config.dify_api_key
        if not api_key:
            raise Exception("未配置 Dify 知识库 API Key，请在 .env 中设置 DIFY_KNOWLEDGE_API_KEY")
        
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/documents/{file_id}"
            headers = {"Authorization": f"Bearer {api_key}"}

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
    enterprise_info_id: str | None = Query(None, description="按企业ID元数据过滤"),
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量，最大 100"),
):
    """
    搜索知识库文件（支持分页）。

    注意：搜索范围是知识库中的全部内容，先从 Dify 获取所有文件，
    然后按文件名关键词过滤，最后再按 enterprise_info_id 元数据过滤，返回结果。
    """
    config = await _get_knowledge_config(db, knowledge_config_id)

    try:
        # 知识库操作需要使用 Dataset API Key
        api_key = get_dify_knowledge_api_key() or config.dify_api_key
        if not api_key:
            raise Exception("未配置 Dify 知识库 API Key，请在 .env 中设置 DIFY_KNOWLEDGE_API_KEY")
        
        async with aiohttp.ClientSession() as session:
            url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/documents"
            headers = {"Authorization": f"Bearer {api_key}"}

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

            # 按 enterprise_info_id 元数据过滤
            if enterprise_info_id:
                filtered_items = [
                    item for item in filtered_items
                    if _filter_by_enterprise_info_id(item, enterprise_info_id)
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


def _filter_by_enterprise_info_id(item: dict, enterprise_info_id: str) -> bool:
    """
    检查文档的元数据是否匹配指定的企业ID。
    Dify 文档的元数据存储在 doc_metadata 字段中，格式为数组，
    每个元素有 name、type、value 字段。
    """
    doc_metadata = item.get("doc_metadata", [])
    if not isinstance(doc_metadata, list):
        return False
    for meta in doc_metadata:
        if meta.get("name") == "company" and meta.get("value") == enterprise_info_id:
            return True
    return False


async def _get_metadata_id(
    session: aiohttp.ClientSession,
    config: KnowledgeConfig,
    metadata_name: str,
) -> str | None:
    """
    查询 Dify 知识库的元数据字段列表，返回指定名称的元数据字段 ID。
    如果找不到，返回 None。
    """
    api_key = get_dify_knowledge_api_key() or config.dify_api_key
    if not api_key:
        raise Exception("未配置 Dify 知识库 API Key，请在 .env 中设置 DIFY_KNOWLEDGE_API_KEY")
    
    url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/metadata"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    async with session.get(url, headers=headers) as response:
        if response.status != 200:
            raise Exception(f"查询元数据字段列表失败: {await response.text()}")
        
        data = await response.json()
        metadata_list = data.get("doc_metadata", [])
        
        for metadata in metadata_list:
            if metadata.get("name") == metadata_name:
                return metadata.get("id")
        
        return None


async def _add_document_metadata(
    session: aiohttp.ClientSession,
    config: KnowledgeConfig,
    document_id: str,
    enterprise_info_id: str,
) -> None:
    """
    为 Dify 文档添加元数据
    API 文档：POST /v1/datasets/{dataset_id}/documents/metadata
    批量更新文档元数据
    """
    # 知识库操作需要使用 Dataset API Key
    api_key = get_dify_knowledge_api_key() or config.dify_api_key
    if not api_key:
        raise Exception("未配置 Dify 知识库 API Key，请在 .env 中设置 DIFY_KNOWLEDGE_API_KEY")
    
    # 先查询 company 元数据字段的 ID
    company_metadata_id = await _get_metadata_id(session, config, "company")
    if not company_metadata_id:
        logger.warning(f"⚠️ 知识库中不存在 company 元数据字段，跳过元数据添加")
        return
    
    url = f"{config.dify_base_url}/v1/datasets/{config.knowledge_id}/documents/metadata"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "operation_data": [
            {
                "document_id": document_id,
                "metadata_list": [
                    {
                        "id": company_metadata_id,
                        "name": "company",
                        "value": enterprise_info_id
                    }
                ]
            }
        ]
    }
    
    # 脱敏打印 API Key（只显示前10个字符）
    masked_key = api_key[:10] + "..." if len(api_key) > 10 else api_key
    logger.info(f"准备添加元数据到 Dify: URL={url}, API_Key={masked_key}, payload={payload}")
    
    async with session.post(url, json=payload, headers=headers) as response:
        response_text = await response.text()
        logger.info(f"Dify 元数据 API 响应: status={response.status}, body={response_text}")
        if response.status not in (200, 201):
            raise Exception(f"Dify 元数据 API 失败: {response_text}")
        logger.info(f"Dify 元数据添加成功: {response_text}")


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