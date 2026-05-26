"""对话相关 Pydantic Schema"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class MessageBase(BaseModel):
    """消息基础 Schema"""
    content: str
    role: str


class MessageCreate(MessageBase):
    """创建消息"""
    pass


class MessageResponse(MessageBase):
    """消息响应"""
    id: UUID
    conversation_id: UUID
    document_id: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageWithDocumentResponse(MessageResponse):
    """带文档的消息响应"""
    document: "DocumentResponse | None" = None


class ConversationBase(BaseModel):
    """对话基础 Schema"""
    title: str = "新对话"


class ConversationCreate(ConversationBase):
    """创建对话"""
    knowledge_config_id: UUID | None = None


class ConversationUpdate(BaseModel):
    """更新对话"""
    title: str | None = None


class ConversationResponse(ConversationBase):
    """对话响应"""
    id: UUID
    knowledge_config_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationWithMessagesResponse(ConversationResponse):
    """带消息列表的对话响应"""
    messages: list[MessageResponse] = []
    document_count: int = 0


class SendMessageRequest(BaseModel):
    """发送消息请求"""
    content: str = Field(..., min_length=1, description="消息内容")
    knowledge_config_id: UUID | None = Field(None, description="知识库配置 ID")


class SendMessageResponse(BaseModel):
    """发送消息响应（非流式）"""
    message_id: UUID
    role: str = "assistant"
    content: str
    document: "DocumentResponse | None" = None
    citations: list["CitationResponse"] = []


class ConversationListResponse(BaseModel):
    """对话列表响应（带分页）"""
    items: list[ConversationWithMessagesResponse]
    total: int
    page: int
    page_size: int


# 前向引用
from app.schemas.document import DocumentResponse
from app.schemas.citation import CitationResponse
