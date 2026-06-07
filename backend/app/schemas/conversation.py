"""对话相关 Pydantic Schema"""
from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas._datetime import CstDatetime
from app.schemas.document import DocumentResponse, DocumentWithCitationsResponse
from app.schemas.citation import CitationResponse


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
    docx_url: str | None = None
    thinking_content: str | None = None
    created_at: CstDatetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_docx(cls, msg: "Message") -> "MessageResponse":
        """从 ORM Message 构造，自动生成 docx_url"""
        docx_url = None
        if msg.role == "assistant" and msg.document_id:
            docx_url = f"/api/v1/documents/{msg.document_id}/export-docx"
        return cls(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role,
            content=msg.content,
            document_id=msg.document_id,
            docx_url=docx_url,
            thinking_content=msg.thinking_content,
            created_at=msg.created_at,
        )


class MessageWithDocumentResponse(MessageResponse):
    """带文档的消息响应"""
    document: "DocumentWithCitationsResponse | None" = None


class ConversationBase(BaseModel):
    """对话基础 Schema"""
    title: str = "新对话"


class ConversationCreate(ConversationBase):
    """创建对话"""
    knowledge_config_id: UUID | None = None
    project_workspace_id: UUID | None = Field(None, description="所属项目空间ID")


class ConversationUpdate(BaseModel):
    """更新对话"""
    title: str | None = None


class ConversationResponse(ConversationBase):
    """对话响应"""
    id: UUID
    knowledge_config_id: UUID | None = None
    created_at: CstDatetime
    updated_at: CstDatetime

    model_config = {"from_attributes": True}


class ConversationWithMessagesResponse(ConversationResponse):
    """带消息列表的对话响应"""
    messages: list[MessageResponse] = []
    message_count: int = 0
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
    document: Optional[DocumentResponse] = None
    citations: list[CitationResponse] = []


class ConversationListResponse(BaseModel):
    """对话列表响应（带分页）"""
    items: list[ConversationWithMessagesResponse]
    total: int
    page: int
    page_size: int
