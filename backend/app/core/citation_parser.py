"""引用标注解析器"""
import re
import structlog
from dataclasses import dataclass, field
from typing import Any

logger = structlog.get_logger()


@dataclass
class ParsedCitation:
    """解析后的引用"""
    ref_mark: str          # 引用标号，如 "①"
    citation_id: str       # 引用 ID
    position_start: int    # 在文档中的起始位置
    position_end: int      # 在文档中的结束位置
    chunk_index: int       # 对应的 chunk 索引


@dataclass
class ParsedDocument:
    """解析后的文档"""
    content: str
    citations: list[ParsedCitation] = field(default_factory=list)


class CitationParser:
    """
    引用标注解析器
    
    职责：从 LLM 输出中解析引用标注，建立「文本位置 ↔ 知识库片段」的映射
    
    约定 LLM 输出格式：
    - 引用标注使用 [①][②][③] 等上标标记
    - 每个标记对应检索结果中的片段索引
    """

    # 引用标注正则表达式
    CITATION_PATTERN = re.compile(r"\[([①-⑩]|\[\d+\])\]")

    def parse(self, content: str, chunks: list[dict]) -> ParsedDocument:
        """
        解析文档内容中的引用标注
        
        Args:
            content: 文档内容
            chunks: 检索结果片段列表
        
        Returns:
            ParsedDocument: 解析后的文档
        """
        citations = []
        positions = []  # [(start, end, mark, index), ...]

        # 查找所有引用标注
        for match in self.CITATION_PATTERN.finditer(content):
            start, end = match.span()
            mark = match.group(0)
            # 提取标注内容
            inner = match.group(1)

            # 转换标注为索引
            index = self._mark_to_index(inner)
            if index is not None and index < len(chunks):
                positions.append((start, end, mark, index))

        # 计算每个引用的精确位置
        offset = 0
        for start, end, mark, index in positions:
            # 考虑前面的引用标注导致的偏移
            adjusted_start = start - offset
            adjusted_end = end - offset

            citation = ParsedCitation(
                ref_mark=mark,
                citation_id=f"citation_{index + 1}",
                position_start=adjusted_start,
                position_end=adjusted_end,
                chunk_index=index,
            )
            citations.append(citation)
            offset += end - start  # 移除标注占用的字符

        logger.info(
            "citations_parsed",
            total_citations=len(citations),
            content_length=len(content),
        )

        return ParsedDocument(
            content=content,
            citations=citations,
        )

    def reparse_after_edit(
        self,
        content: str,
        existing_citations: list[dict],
    ) -> list[dict]:
        """
        用户编辑文档后重新解析引用
        
        Args:
            content: 编辑后的文档内容
            existing_citations: 已有的引用列表
        
        Returns:
            更新后的引用列表
        """
        updated_citations = []

        for citation in existing_citations:
            ref_mark = citation.get("ref_mark", "")
            old_content = citation.get("chunk_content", "")

            # 查找新的位置
            new_position = content.find(old_content[:50]) if old_content else -1

            if new_position >= 0:
                updated_citation = citation.copy()
                updated_citation["position_start"] = new_position
                updated_citation["position_end"] = new_position + len(old_content)
                updated_citations.append(updated_citation)
            else:
                logger.warning(
                    "citation_content_moved",
                    ref_mark=ref_mark,
                    old_content=old_content[:50],
                )

        return updated_citations

    def _mark_to_index(self, mark: str) -> int | None:
        """将引用标注转换为索引"""
        # 中文圈数字
        mark_map = {
            "①": 0, "②": 1, "③": 2, "④": 3, "⑤": 4,
            "⑥": 5, "⑦": 6, "⑧": 7, "⑨": 8, "⑩": 9,
        }

        if mark in mark_map:
            return mark_map[mark]

        # [数字] 格式
        num_match = re.match(r"\[(\d+)\]", mark)
        if num_match:
            return int(num_match.group(1)) - 1

        return None

    def remove_citation_marks(self, content: str) -> str:
        """移除内容中的引用标注"""
        return self.CITATION_PATTERN.sub("", content)

    def add_citation_mark(self, content: str, position: int, mark: str) -> str:
        """在指定位置添加引用标注"""
        return content[:position] + mark + content[position:]
