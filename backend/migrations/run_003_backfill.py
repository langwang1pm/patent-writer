"""迁移脚本：为已有 AI 回复消息创建 Document 实体并关联

兼容 PostgreSQL 12（不支持 gen_random_uuid()，使用 Python uuid4）
"""
import asyncio
import uuid
from sqlalchemy import text, select
from app.db.engine import async_session_maker
from app.models.conversation import Message
from app.models.document import Document


async def run_migration():
    async with async_session_maker() as session:
        # 查看有多少条需要处理
        result = await session.execute(
            text("SELECT count(*) FROM patentwriter.messages WHERE role='assistant' AND document_id IS NULL")
        )
        count = result.scalar()
        print(f"需要处理的 assistant 消息数: {count}")

        if count == 0:
            print("没有需要处理的数据，跳过迁移")
            return

        # 查询所有未关联 document_id 的 assistant 消息
        result = await session.execute(
            select(Message).where(
                Message.role == "assistant",
                Message.document_id.is_(None),
            ).order_by(Message.created_at)
        )
        messages = result.scalars().all()
        print(f"查到 {len(messages)} 条消息")

        created = 0
        linked = 0
        for msg in messages:
            # 创建 Document
            doc_id = uuid.uuid4()
            title = msg.content[:30].replace("\n", " ").strip() or "AI 回复"

            doc = Document(
                id=doc_id,
                conversation_id=msg.conversation_id,
                title=title,
                content_html=msg.content,
                content_markdown=msg.content,
                version=1,
                created_at=msg.created_at,
                updated_at=msg.created_at,
            )
            session.add(doc)
            created += 1

            # 关联到 Message
            msg.document_id = doc_id
            linked += 1

        await session.commit()
        print(f"迁移完成! 创建 Document: {created}, 关联 Message: {linked}")

        # 验证
        result = await session.execute(
            text("SELECT count(*) FROM patentwriter.messages WHERE role='assistant' AND document_id IS NULL")
        )
        remaining = result.scalar()
        print(f"迁移后未关联的 assistant 消息数: {remaining}")


if __name__ == "__main__":
    asyncio.run(run_migration())
