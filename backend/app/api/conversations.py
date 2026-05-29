"""对话管理 API"""
import uuid
import json
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.config import get_settings
from app.models.conversation import Conversation, Message
from app.models import now_cst
from app.models.document import Document
from app.services.markdown_docx_svc import markdown_to_docx_bytes
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
from app.schemas.document import DocumentResponse
from app.schemas.citation import CitationResponse
from app.clients.dify_client import DifyClient, RetrieveResult
from app.services.llm_svc import LLMService
from app.services.document_svc import DocumentService
from app.services.citation_svc import CitationService
from app.core.citation_parser import CitationParser

import structlog

logger = structlog.get_logger()

router = APIRouter()


def _get_dify_client() -> DifyClient:
    """创建 Dify 客户端实例"""
    settings = get_settings()
    return DifyClient(
        base_url=settings.dify_base_url,
        api_key=settings.dify_api_key,
        knowledge_id=settings.dify_knowledge_id,
        top_k=settings.retrieval_top_k,
        score_threshold=settings.score_threshold,
        rerank=settings.rerank_enabled,
        timeout=settings.dify_timeout_s,
        retries=settings.dify_retries,
    )


def _get_llm_service() -> LLMService:
    """创建 LLM 服务实例"""
    return LLMService(dify_client=_get_dify_client())


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
    """获取对话列表（无 N+1）"""
    msg_count_sub = (
        select(Message.conversation_id, func.count(Message.id).label("msg_count"))
        .group_by(Message.conversation_id)
        .subquery()
    )

    doc_count_sub = (
        select(Document.conversation_id, func.count(Document.id).label("doc_count"))
        .group_by(Document.conversation_id)
        .subquery()
    )

    query = (
        select(
            Conversation,
            func.coalesce(msg_count_sub.c.msg_count, 0).label("msg_count"),
            func.coalesce(doc_count_sub.c.doc_count, 0).label("doc_count"),
        )
        .outerjoin(msg_count_sub, Conversation.id == msg_count_sub.c.conversation_id)
        .outerjoin(doc_count_sub, Conversation.id == doc_count_sub.c.conversation_id)
    )

    count_query = select(func.count(Conversation.id))

    if search:
        query = query.where(Conversation.title.ilike(f"%{search}%"))
        count_query = count_query.where(Conversation.title.ilike(f"%{search}%"))

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    query = query.order_by(desc(Conversation.updated_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    response_items = [
        ConversationWithMessagesResponse(
            id=row._mapping["Conversation"].id,
            title=row._mapping["Conversation"].title,
            knowledge_config_id=row._mapping["Conversation"].knowledge_config_id,
            created_at=row._mapping["Conversation"].created_at,
            updated_at=row._mapping["Conversation"].updated_at,
            messages=[],
            message_count=row._mapping["msg_count"],
            document_count=row._mapping["doc_count"],
        )
        for row in rows
    ]

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
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="对话不存在")

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
    发送消息并调用 Dify Agent 生成回复（非流式）

    完整流程：
    1. 保存用户消息
    2. 调用 Dify Agent（内部已集成知识库检索 RAG）
    3. 保存 AI 回复
    4. 返回结果
    """
    # 验证对话存在
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")

    # 创建用户消息
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=data.content,
    )
    db.add(user_message)
    await db.flush()

    # 首条用户消息 → 自动生成标题
    if conversation.title == '新对话':
        count_result = await db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id == conversation_id,
                Message.role == 'user',
            )
        )
        if count_result.scalar() == 1:
            auto_title = data.content[:30].replace(chr(10), ' ').strip()
            if auto_title:
                conversation.title = auto_title

    conversation.updated_at = now_cst()

    # ── 调用 Dify Agent 生成回复 ──
    try:
        llm = _get_llm_service()

        # 检查是否有已存的 Dify conversation_id（存在 message metadata 中）
        # 简化实现：每次都作为新对话，后续可扩展为多轮
        answer, dify_conv_id, citations_chunks = await llm.generate_sync(
            user_message=data.content,
            task_type="技术交底书",
            conversation_id=None,
        )

        ai_content = answer or "（AI 未返回内容，请检查 Dify 服务配置）"

    except Exception as e:
        logger.error("dify_call_failed", error=str(e), conversation_id=str(conversation_id))
        ai_content = f"⚠️ 调用 AI 服务失败：{str(e)}\n\n请检查 Dify 服务是否正常运行，或稍后重试。"

    # 创建 AI 回复
    ai_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_content,
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
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    SSE 流式生成回复 — 调用 Dify Agent 流式 API，并持久化消息到数据库
    
    完整流程：
    1. 验证对话存在
    2. 保存用户消息到数据库
    3. 流式调用 Dify，实时返回内容片段
    4. 流式结束后，保存 AI 回复到数据库
    5. 返回 done 事件，包含消息 ID
    """
    from fastapi.responses import StreamingResponse

    settings = get_settings()
    dify = _get_dify_client()

    # 验证对话存在
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")

    # ── 1. 保存用户消息 ──
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=content,
    )
    db.add(user_message)
    await db.flush()
    await db.refresh(user_message)
    user_message_id = user_message.id

    # 更新对话标题（首条用户消息时）
    if conversation.title == '新对话':
        count_result = await db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id == conversation_id,
                Message.role == 'user',
            )
        )
        user_msg_count = count_result.scalar()
        if user_msg_count == 1:
            auto_title = content[:30].replace(chr(10), ' ').strip()
            if auto_title:
                conversation.title = auto_title
                logger.info(
                    'conversation_title_auto_generated',
                    conversation_id=str(conversation_id),
                    title=auto_title,
                )

    conversation.updated_at = now_cst()
    await db.flush()

    async def event_generator():
        # 发送开始事件（包含 user_message_id）
        yield f"event: message_start\ndata: {{\"conversation_id\": \"{conversation_id}\", \"user_message_id\": \"{user_message_id}\"}}\n\n"

        full_answer = []
        has_error = False
        ai_message_id = None

        try:
            async for event_type, delta, extra_data in dify.chat_messages_stream(
                query=content,
                user_id=f"patent-writer-{conversation_id}",
                conversation_id=None,
                timeout=settings.dify_timeout_s * 40,
            ):
                if event_type == "error":
                    error_msg = delta or "Dify 流式调用出错"
                    yield f"event: error\ndata: {{\"message\": {json.dumps(error_msg, ensure_ascii=False)}}}\n\n"
                    has_error = True
                    break

                if event_type in ("agent_message", "message") and delta:
                    full_answer.append(delta)
                    yield f"event: content_delta\ndata: {{\"delta\": {json.dumps(delta, ensure_ascii=False)}}}\n\n"

                elif event_type == "message_end":
                    conv_id = extra_data.get("conversation_id", "")
                    yield f"event: message_end\ndata: {{\"conversation_id\": \"{conv_id}\"}}\n\n"

            if not has_error:
                # ── 2. 保存 AI 回复 ──
                ai_content = "".join(full_answer) or "（AI 未返回内容，请检查 Dify 服务配置）"
                ai_message = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=ai_content,
                )
                db.add(ai_message)
                await db.flush()
                await db.refresh(ai_message)
                ai_message_id = ai_message.id

                logger.info(
                    "stream_message_saved",
                    conversation_id=str(conversation_id),
                    user_msg_id=str(user_message_id),
                    ai_msg_id=str(ai_message_id),
                    answer_len=len(ai_content),
                )

        except Exception as e:
            logger.error("stream_error", error=str(e), conversation_id=str(conversation_id))
            yield f"event: error\ndata: {{\"message\": {json.dumps(f'流式生成异常: {str(e)}', ensure_ascii=False)}}}\n\n"
            has_error = True

        # 发送 done 事件（包含 message IDs + docx 导出链接）
        # 使用相对路径，前端直接拼接在后端地址后
        docx_url = f"/api/v1/conversations/{conversation_id}/messages/{ai_message_id}/export-docx" if ai_message_id else None
        done_data = {
            "user_message_id": str(user_message_id),
            "ai_message_id": str(ai_message_id) if ai_message_id else None,
            "docx_url": docx_url,
        }
        yield f"event: done\ndata: {json.dumps(done_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations/{conversation_id}/messages/{message_id}/export-docx")
async def export_message_as_docx(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """将 AI 回复消息导出为 .docx 文件

    从 Message.content（Markdown 格式）生成格式化的 Word 文档。
    """
    from fastapi.responses import StreamingResponse
    import io

    # 查询消息
    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.conversation_id == conversation_id,
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="消息不存在")
    if message.role != "assistant":
        raise HTTPException(status_code=400, detail="只能导出 AI 回复消息")

    # 从 Markdown 生成 docx bytes
    docx_bytes = markdown_to_docx_bytes(
        markdown_text=message.content,
        title=message.conversation.title if hasattr(message, 'conversation') else "AI 回复",
    )

    # 生成文件名（取对话标题前 30 字符）
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    filename = (conv.title[:30] if conv else "document").replace("/", "-").replace("\\", "-") + ".docx"

    logger.info(
        "message_exported_as_docx",
        conversation_id=str(conversation_id),
        message_id=str(message_id),
        filename=filename,
    )

    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
