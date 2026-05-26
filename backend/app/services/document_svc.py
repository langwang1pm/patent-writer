"""文档服务"""
import uuid
import structlog

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.models.citation import Citation

logger = structlog.get_logger()


class DocumentService:
    """文档业务服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_document(
        self,
        conversation_id: uuid.UUID,
        title: str,
        content_html: str,
        content_markdown: str | None = None,
    ) -> Document:
        """创建文档"""
        document = Document(
            conversation_id=conversation_id,
            title=title,
            content_html=content_html,
            content_markdown=content_markdown,
        )
        self.db.add(document)
        await self.db.flush()
        await self.db.refresh(document)
        logger.info("document_created", document_id=str(document.id))
        return document

    async def get_document(self, document_id: uuid.UUID) -> Document | None:
        """获取文档"""
        result = await self.db.execute(
            select(Document).where(Document.id == document_id)
        )
        return result.scalar_one_or_none()

    async def get_document_with_citations(
        self,
        document_id: uuid.UUID,
    ) -> Document | None:
        """获取文档（含引用）"""
        result = await self.db.execute(
            select(Document)
            .options(selectinload(Document.citations))
            .where(Document.id == document_id)
        )
        return result.scalar_one_or_none()

    async def update_document(
        self,
        document_id: uuid.UUID,
        title: str | None = None,
        content_html: str | None = None,
        content_markdown: str | None = None,
    ) -> Document | None:
        """更新文档"""
        document = await self.get_document(document_id)
        if not document:
            return None

        if title is not None:
            document.title = title
        if content_html is not None:
            document.content_html = content_html
        if content_markdown is not None:
            document.content_markdown = content_markdown

        document.version += 1

        await self.db.flush()
        await self.db.refresh(document)
        logger.info("document_updated", document_id=str(document.id), version=document.version)
        return document

    async def delete_document(self, document_id: uuid.UUID) -> bool:
        """删除文档"""
        document = await self.get_document(document_id)
        if not document:
            return False

        await self.db.delete(document)
        logger.info("document_deleted", document_id=str(document.id))
        return True

    async def get_conversation_documents(
        self,
        conversation_id: uuid.UUID,
    ) -> list[Document]:
        """获取对话的所有文档"""
        result = await self.db.execute(
            select(Document)
            .where(Document.conversation_id == conversation_id)
            .order_by(Document.created_at.desc())
        )
        return result.scalars().all()
