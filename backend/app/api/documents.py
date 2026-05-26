"""文档管理 API"""
import uuid
import io
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.document import Document
from app.models.citation import Citation
from app.schemas.document import (
    DocumentUpdate,
    DocumentResponse,
    DocumentWithCitationsResponse,
    DocumentPreview,
    ExportDocumentRequest,
)

router = APIRouter()


@router.get("/documents/{document_id}", response_model=DocumentWithCitationsResponse)
async def get_document(
    document_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """获取文档详情"""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.citations))
        .where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 统计引用数量
    citation_count = len(document.citations)

    return DocumentWithCitationsResponse(
        id=document.id,
        conversation_id=document.conversation_id,
        title=document.title,
        content_html=document.content_html,
        content_markdown=document.content_markdown,
        version=document.version,
        created_at=document.created_at,
        updated_at=document.updated_at,
        citation_count=citation_count,
        citations=document.citations,
    )


@router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: uuid.UUID,
    data: DocumentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """更新文档内容"""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    if data.title is not None:
        document.title = data.title
    if data.content_html is not None:
        document.content_html = data.content_html
    if data.content_markdown is not None:
        document.content_markdown = data.content_markdown

    document.version += 1

    await db.flush()
    await db.refresh(document)

    return document


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """删除文档"""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    await db.delete(document)
    return None


@router.post("/documents/{document_id}/export")
async def export_document(
    document_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """导出文档为 Word 格式
    
    TODO: 实现完整的 Word 导出逻辑
    """
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.citations))
        .where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")

    # TODO: 使用 python-docx 实现真正的导出
    # 当前返回模拟文件
    content = f"""
    {document.title}
    {'=' * len(document.title)}
    
    {document.content_html}
    
    ---
    引用来源
    ---
    """
    for i, citation in enumerate(document.citations, 1):
        content += f"\n[{i}] {citation.source_name}\n{citation.chunk_content}\n"

    # 生成简单的文本文件作为演示
    file_content = content.encode("utf-8")
    
    return StreamingResponse(
        io.BytesIO(file_content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{document.title}.docx"'
        },
    )
