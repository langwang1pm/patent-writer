"""对话管理 API"""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationWithMessagesResponse,
    ConversationListResponse,
    MessageResponse,
    SendMessageRequest,
    SendMessageResponse,
)

router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    data: ConversationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """创建新对话"""
    conversation = Conversation(
        title=data.title,
        knowledge_config_id=data.knowledge_config_id,
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)
    return conversation


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="搜索标题"),
):
    """获取对话列表"""
    # 构建查询
    query = select(Conversation)
    count_query = select(func.count(Conversation.id))

    if search:
        query = query.where(Conversation.title.ilike(f"%{search}%"))
        count_query = count_query.where(Conversation.title.ilike(f"%{search}%"))

    # 排序和分页
    query = query.order_by(desc(Conversation.updated_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    # 执行查询
    result = await db.execute(query)
    conversations = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar()

    # 获取消息数量
    response_items = []
    for conv in conversations:
        # 获取消息数
        msg_count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        msg_count = msg_count_result.scalar()

        # 获取文档数
        doc_count_result = await db.execute(
            select(func.count(Document.id)).where(Document.conversation_id == conv.id)
        )
        doc_count = doc_count_result.scalar()

        response_items.append(
            ConversationWithMessagesResponse(
                id=conv.id,
                title=conv.title,
                knowledge_config_id=conv.knowledge_config_id,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                messages=[],
                document_count=doc_count,
            )
        )

    return ConversationListResponse(
        items=response_items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessagesResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """获取对话详情"""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")

    return conversation


@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: uuid.UUID,
    data: ConversationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """更新对话"""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")

    if data.title is not None:
        conversation.title = data.title

    await db.flush()
    await db.refresh(conversation)
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """删除对话"""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")

    await db.delete(conversation)
    return None


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """获取对话消息列表"""
    # 验证对话存在
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="对话不存在")

    # 获取消息
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return messages


@router.post("/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    conversation_id: uuid.UUID,
    data: SendMessageRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    发送消息并生成回复（MVP 简化版，非流式）
    
    完整流程：
    1. 调用 Dify 知识库检索
    2. 调用 LLM 生成内容
    3. 解析引用标注
    4. 持久化文档和引用
    """
    # 验证对话存在
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")

    # TODO: 实现完整的 RAG + LLM 生成流程
    # 当前返回模拟数据

    # 创建用户消息
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=data.content,
    )
    db.add(user_message)

    # TODO: 调用 Dify 检索 + LLM 生成
    # 模拟 AI 回复
    mock_content = f"已收到您的需求：{data.content}\n\n正在调用知识库检索...\n\n[MVP 阶段请实现完整的 RAG 流程]"

    # 创建 AI 回复
    ai_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=mock_content,
    )
    db.add(ai_message)

    await db.flush()
    await db.refresh(ai_message)

    return SendMessageResponse(
        message_id=ai_message.id,
        role="assistant",
        content=ai_message.content,
        document=None,
        citations=[],
    )


@router.get("/conversations/{conversation_id}/stream")
async def stream_message(
    conversation_id: uuid.UUID,
    content: str = Query(..., description="消息内容"),
    knowledge_config_id: uuid.UUID | None = Query(None, description="知识库配置 ID"),
):
    """
    SSE 流式生成回复
    
    TODO: 实现完整的流式生成流程
    """
    import asyncio
    from fastapi.responses import StreamingResponse

    async def event_generator():
        # 发送开始事件
        yield "event: message_start\ndata: {}\n\n"

        # TODO: 实现 Dify 检索 + LLM 流式生成
        # 模拟流式输出
        words = ["正在", "分析", "需求", "...", "\n\n", "[MVP", "阶段", "请", "实现]"]
        for word in words:
            yield f"event: content_delta\ndata: {{\"delta\": \"{word}\"}}\n\n"
            await asyncio.sleep(0.1)

        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
