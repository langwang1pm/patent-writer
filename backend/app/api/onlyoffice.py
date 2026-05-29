"""OnlyOffice 编辑器配置与回调 API

端点：
- GET  /onlyoffice/editor-config  — 获取编辑器配置（前端用此初始化 OnlyOffice JS）
- POST /onlyoffice/callback       — OnlyOffice 保存回调
- GET  /onlyoffice/file/{file_key} — OnlyOffice 文档服务器下载文件的入口
"""
import uuid
import aiohttp
import structlog
from pathlib import Path
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.knowledge_file import KnowledgeFile
from app.services.onlyoffice_svc import get_onlyoffice_service, OnlyOfficeService

logger = structlog.get_logger()

router = APIRouter()


@router.get("/onlyoffice/editor-config")
async def get_editor_config(
    file_key: str = Query(..., description="文件标识（知识库用 dify_document_id）"),
    mode: str = Query("view", description="编辑模式: view / edit"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    获取 OnlyOffice 编辑器配置

    前端拿到配置后，传入 OnlyOffice JS API 初始化编辑器。
    file_key 的格式约定：
    - 知识库文件: "kb:{dify_document_id}"
    - 生成文档:   "doc:{document_uuid}" (将来扩展)
    """
    svc = get_onlyoffice_service()

    # 解析 file_key，获取文件信息
    file_name, file_url = await _resolve_file_info(file_key, db)

    # 构建回调 URL（编辑模式需要）
    callback_url = None
    if mode == "edit":
        # 回调地址指向后端，OnlyOffice 服务器会调用此 URL
        callback_url = f"{svc.callback_base_url}/api/v1/onlyoffice/callback?file_key={file_key}"

    # OnlyOffice 下载文件的 URL（由后端提供）
    download_url = f"{svc.callback_base_url}/api/v1/onlyoffice/file/{file_key}"

    config = svc.build_editor_config(
        file_key=file_key,
        file_name=file_name,
        file_url=download_url,
        mode=mode,
        callback_url=callback_url,
    )

    return {
        "doc_server_url": svc.doc_server_url,
        "config": config,
    }


@router.post("/onlyoffice/callback")
async def onlyoffice_callback(
    request: Request,
    file_key: str = Query(..., description="文件标识"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    OnlyOffice 文档服务器回调

    OnlyOffice 编辑保存后会调用此接口。
    status 含义：
    - 0: 无变化
    - 1: 正在编辑（文档被锁定）
    - 2: 文档已准备好保存
    - 3: 保存出错
    - 4: 文档关闭无修改
    - 6: 正在编辑但当前状态已保存（forcesave）
    - 7: 保存出错（forcesave）

    回调必须返回 {"error": 0} 表示成功。
    """
    body = await request.json()
    status = body.get("status")
    url = body.get("url")

    logger.info(
        "onlyoffice_callback",
        file_key=file_key,
        status=status,
        has_url=bool(url),
    )

    if status in (2, 6):
        # 文档需要保存
        if url:
            await _save_file_from_callback(file_key, url, db)
        else:
            logger.warning("callback_missing_url", file_key=file_key, status=status)

    # OnlyOffice 要求返回 {"error": 0}
    return {"error": 0}


@router.get("/onlyoffice/file/{file_key:path}")
async def serve_file_for_onlyoffice(
    file_key: str,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    为 OnlyOffice 文档服务器提供文件下载

    OnlyOffice 服务器通过此 URL 下载文件内容。
    必须确保 OnlyOffice 服务器能访问此地址。
    """
    file_path, file_name = await _resolve_file_path(file_key, db)

    if not file_path or not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="文件不存在")

    import mimetypes
    media_type, _ = mimetypes.guess_type(str(file_path))
    if not media_type:
        media_type = "application/octet-stream"

    from urllib.parse import quote
    encoded_filename = quote(file_name, safe='')

    return FileResponse(
        path=str(file_path),
        filename=file_name,
        media_type=media_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}",
        }
    )


async def _resolve_file_info(file_key: str, db: AsyncSession | None) -> tuple[str, str]:
    """
    根据 file_key 解析文件名和下载 URL

    Returns:
        (file_name, download_url)
    """
    if file_key.startswith("kb:"):
        # 知识库文件
        dify_doc_id = file_key[3:]
        if db is None:
            raise HTTPException(status_code=500, detail="数据库会话不可用")

        result = await db.execute(
            select(KnowledgeFile).where(KnowledgeFile.dify_document_id == dify_doc_id)
        )
        kf = result.scalar_one_or_none()
        if not kf:
            raise HTTPException(status_code=404, detail="知识库文件不存在")

        file_name = kf.name
        download_url = ""  # 由 serve_file_for_onlyoffice 提供，此处不需要

        return file_name, download_url

    elif file_key.startswith("doc:"):
        # 生成文档（将来扩展）
        raise HTTPException(status_code=501, detail="生成文档预览暂未实现")

    else:
        raise HTTPException(status_code=400, detail=f"不支持的 file_key 格式: {file_key}")


async def _resolve_file_path(file_key: str, db: AsyncSession | None) -> tuple[str | None, str]:
    """
    根据 file_key 解析本地文件路径和文件名

    Returns:
        (file_path, file_name)
    """
    if file_key.startswith("kb:"):
        dify_doc_id = file_key[3:]
        if db is None:
            return None, ""

        result = await db.execute(
            select(KnowledgeFile).where(KnowledgeFile.dify_document_id == dify_doc_id)
        )
        kf = result.scalar_one_or_none()
        if not kf:
            return None, ""

        return kf.local_path, kf.name

    elif file_key.startswith("doc:"):
        # 将来扩展：生成文档
        return None, ""

    return None, ""


async def _save_file_from_callback(file_key: str, download_url: str, db: AsyncSession | None):
    """从 OnlyOffice 回调 URL 下载最新文件并保存到本地"""
    import os

    file_path, file_name = await _resolve_file_path(file_key, db)
    if not file_path:
        logger.warning("save_callback_no_local_path", file_key=file_key)
        return

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(download_url) as response:
                if response.status == 200:
                    content = await response.read()
                    # 覆盖原文件
                    with open(file_path, "wb") as f:
                        f.write(content)
                    logger.info(
                        "file_saved_from_callback",
                        file_key=file_key,
                        file_path=file_path,
                        size=len(content),
                    )
                else:
                    logger.error(
                        "callback_download_failed",
                        file_key=file_key,
                        status=response.status,
                    )
    except Exception as e:
        logger.error("save_callback_error", file_key=file_key, error=str(e))
