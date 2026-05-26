"""引用相关 Pydantic Schema"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class CitationBase(BaseModel):
    """引用基础 Schema"""
    ref_mark: str
    source_name: str
    chunk_content: str


class CitationCreate(CitationBase):
    """创建引用"""
    document_id: UUID
    source_id: str | None = None
    chunk_id: str | None = None
    score: float | None = None
    position_start: int | None = None
    position_end: int | None = None


class CitationResponse(CitationBase):
    """引用响应"""
    id: UUID
    document_id: UUID
    source_id: str | None = None
    chunk_id: str | None = None
    score: float | None = None
    position_start: int | None = None
    position_end: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CitationDetailResponse(CitationResponse):
    """引用详情响应（包含原始片段）"""
    pass


class CitationListResponse(BaseModel):
    """引用列表响应"""
    items: list[CitationResponse]
    total: int
    document_id: UUID
