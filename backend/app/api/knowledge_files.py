"""知识库文件管理 API"""
import uuid
import aiohttp
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.knowledge_config import KnowledgeConfig

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
                return {
                    "items": data.get("data", []),
                    "total": len(data.get("data", [])),
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

            # 准备表单数据
            form_data = aiohttp.FormData()
            form_data.add_field(
                'file',
                await file.read(),
                filename=file.filename,
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
