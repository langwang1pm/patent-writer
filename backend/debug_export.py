"""调试：模拟 export_message_as_docx 的完整流程"""
import sys
import io
import asyncio

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

async def main():
    from app.database import async_session_factory
    from sqlalchemy import select
    from app.models.conversation import Message, Conversation
    from app.services.markdown_docx_svc import markdown_to_docx_bytes
    import uuid

    conv_id = uuid.UUID("d7827688-62b0-4fee-9347-de0aa826b54c")
    msg_id = uuid.UUID("f2357452-fc0b-462d-8d1e-9853245aefde")

    async with async_session_factory() as db:
        result = await db.execute(
            select(Message).where(
                Message.id == msg_id,
                Message.conversation_id == conv_id,
            )
        )
        message = result.scalar_one_or_none()
        if not message:
            print("消息不存在!")
            return
        print(f"Message role: {message.role}")
        print(f"Content length: {len(message.content)}")
        print(f"Content preview: {repr(message.content[:200])}")

        r2 = await db.execute(select(Conversation).where(Conversation.id == conv_id))
        conv = r2.scalar_one_or_none()
        title = conv.title[:30] if conv else "document"
        print(f"Title: {title}")

        try:
            docx_bytes = markdown_to_docx_bytes(
                markdown_text=message.content,
                title=title,
            )
            print(f"SUCCESS: {len(docx_bytes)} bytes")
        except Exception as e:
            import traceback
            print(f"ERROR: {e}")
            traceback.print_exc()

asyncio.run(main())
