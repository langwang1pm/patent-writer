"""文档相关 Pydantic Schema"""
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas._datetime import CstDatetime


class DocumentBase(BaseModel):
    """文档基础 Schema"""
    title: str
    content_html: str = ""


class DocumentCreate(DocumentBase):
    """创建文档"""
    conversation_id: UUID


class DocumentUpdate(BaseModel):
    """更新文档"""
    title: str | None = None
    content_html: str | None = None
    content_markdown: str | None = None


class DocumentResponse(DocumentBase):
    """文档响应"""
    id: UUID
    conversation_id: UUID
    content_markdown: str | None = None
    version: int
    created_at: CstDatetime
    updated_at: CstDatetime
    citation_count: int = 0

    model_config = {"from_attributes": True}


class DocumentWithCitationsResponse(DocumentResponse):
    """带引用列表的文档响应"""
    citations: list["CitationResponse"] = []


class DocumentPreview(BaseModel):
    """文档预览（用于列表展示）"""
    id: UUID
    title: str
    preview: str = ""
    citation_count: int = 0
    created_at: CstDatetime

    model_config = {"from_attributes": True}


class ExportDocumentRequest(BaseModel):
    """导出文档请求"""
    include_citations: bool = Field(True, description="是否包含引用列表")
    citation_format: str = Field("hyperlink", description="引用格式: hyperlink | footnote")


# 前向引用
from app.schemas.citation import CitationResponse
