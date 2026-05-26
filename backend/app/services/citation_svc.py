"""引用服务"""
import uuid
import structlog
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.citation import Citation
from app.models.document import Document
from app.clients.dify_client import RetrievedChunk

logger = structlog.get_logger()


class CitationService:
    """引用业务服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_citation(
        self,
        document_id: uuid.UUID,
        ref_mark: str,
        source_name: str,
        chunk_content: str,
        source_id: str | None = None,
        chunk_id: str | None = None,
        score: float | None = None,
        position_start: int | None = None,
        position_end: int | None = None,
    ) -> Citation:
        """创建引用"""
        citation = Citation(
            document_id=document_id,
            ref_mark=ref_mark,
            source_name=source_name,
            chunk_content=chunk_content,
            source_id=source_id,
            chunk_id=chunk_id,
            score=score,
            position_start=position_start,
            position_end=position_end,
        )
        self.db.add(citation)
        await self.db.flush()
        await self.db.refresh(citation)
        return citation

    async def create_citations_from_chunks(
        self,
        document_id: uuid.UUID,
        chunks: list[RetrievedChunk],
        content: str,
    ) -> list[Citation]:
        """
        从检索片段批量创建引用
        
        Args:
            document_id: 文档 ID
            chunks: Dify 检索到的片段
            content: 文档内容（用于计算引用位置）
        
        Returns:
            创建的引用列表
        """
        citations = []
        ref_number = 1

        for chunk in chunks:
            # 查找 chunk 内容在文档中的位置
            position_start = content.find(chunk.content[:50]) if chunk.content else None

            if position_start is not None and position_start >= 0:
                position_end = position_start + len(chunk.content)

                # 生成引用标号
                ref_mark = self._get_ref_mark(ref_number)

                citation = await self.create_citation(
                    document_id=document_id,
                    ref_mark=ref_mark,
                    source_name=chunk.source_name,
                    chunk_content=chunk.content,
                    source_id=chunk.source_id,
                    chunk_id=chunk.chunk_id,
                    score=chunk.score,
                    position_start=position_start,
                    position_end=position_end,
                )
                citations.append(citation)
                ref_number += 1

        logger.info(
            "citations_created",
            document_id=str(document_id),
            count=len(citations),
        )
        return citations

    async def get_document_citations(
        self,
        document_id: uuid.UUID,
    ) -> list[Citation]:
        """获取文档的所有引用"""
        result = await self.db.execute(
            select(Citation)
            .where(Citation.document_id == document_id)
            .order_by(Citation.position_start)
        )
        return result.scalars().all()

    async def delete_document_citations(self, document_id: uuid.UUID) -> int:
        """删除文档的所有引用"""
        result = await self.db.execute(
            select(Citation).where(Citation.document_id == document_id)
        )
        citations = result.scalars().all()
        count = len(citations)

        for citation in citations:
            await self.db.delete(citation)

        logger.info(
            "citations_deleted",
            document_id=str(document_id),
            count=count,
        )
        return count

    def _get_ref_mark(self, number: int) -> str:
        """生成引用标号"""
        # 使用中文圈数字
        marks = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"]
        if number <= len(marks):
            return marks[number - 1]
        return f"[{number}]"
