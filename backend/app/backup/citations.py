"""引用管理 API"""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db
from app.models.citation import Citation
from app.models.document import Document
from app.schemas.citation import (
    CitationListResponse,
    CitationDetailResponse,
)

router = APIRouter()


@router.get("/documents/{document_id}/citations", response_model=CitationListResponse)
async def list_citations(
    document_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """获取文档的所有引用"""
    # 验证文档存在
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="文档不存在")

    # 获取引用列表
    result = await db.execute(
        select(Citation)
        .where(Citation.document_id == document_id)
        .order_by(Citation.created_at)
    )
    citations = result.scalars().all()

    return CitationListResponse(
        items=citations,
        total=len(citations),
        document_id=document_id,
    )


@router.get("/citations/{citation_id}", response_model=CitationDetailResponse)
async def get_citation(
    citation_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """获取引用详情"""
    result = await db.execute(
        select(Citation).where(Citation.id == citation_id)
    )
    citation = result.scalar_one_or_none()

    if not citation:
        raise HTTPException(status_code=404, detail="引用不存在")

    return citation
