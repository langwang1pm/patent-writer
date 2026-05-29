"""LLM 服务"""
import structlog
from typing import AsyncGenerator

from app.clients.dify_client import RetrieveResult, DifyClient, RetrievedChunk

logger = structlog.get_logger()

# 专利文档类型的 Prompt 模板（用于 Dify Agent 的提示词配置参考）
PATENT_DOCUMENT_TEMPLATES = {
    "技术交底书": """你是一位专业的专利工程师，擅长撰写高质量的技术交底书。

任务：根据用户提供的需求，生成专利技术交底书。

要求：
1. 严格按照专利格式撰写，包括技术领域、背景技术、发明内容、具体实施方式等章节
2. 结合参考知识库内容，确保技术描述的准确性
3. 引用知识库内容时使用 [①][②][③] 格式标注来源
4. 发明的技术方案应当具体、可实施
5. 语言严谨、专业，避免模糊表述

参考知识库内容：
{references}

用户需求：
{user_message}

请生成技术交底书：""",

    "权利要求书": """你是一位专业的专利工程师，擅长撰写权利要求书。

任务：根据技术交底书内容，撰写专利权利要求书。

要求：
1. 独立权利要求应当概括发明的核心技术方案
2. 从属权利要求应当对独立权利要求进行进一步限定
3. 引用知识库内容时使用 [①][②][③] 格式标注来源
4. 权利要求应当清楚、简洁
5. 应当得到说明书的支持

参考知识库内容：
{references}

技术交底书内容：
{user_message}

请生成权利要求书：""",

    "说明书": """你是一位专业的专利工程师，擅长撰写专利说明书。

任务：根据权利要求书和技术交底书，撰写完整的专利说明书。

要求：
1. 详细描述发明的技术方案，使本领域技术人员能够实现
2. 结合参考知识库内容，确保描述的准确性
3. 引用知识库内容时使用 [①][②][③] 格式标注来源
4. 应当包含技术领域、背景技术、发明内容、附图说明、具体实施方式等章节

参考知识库内容：
{references}

用户需求：
{user_message}

请生成说明书：""",
}


class LLMService:
    """
    LLM 调用服务

    通过 Dify Agent 实现：
    1. 知识库检索（RAG）
    2. 对话式文档生成
    3. 流式响应
    """

    def __init__(self, dify_client: DifyClient):
        self.dify = dify_client

    def build_references_text(self, retrieve_result: RetrieveResult) -> str:
        """构建参考知识库文本（用于日志/调试）"""
        if not retrieve_result.chunks:
            return "（无相关知识库内容）"

        references = []
        for i, chunk in enumerate(retrieve_result.chunks, 1):
            references.append(
                f"[{i}] {chunk.source_name}\n{chunk.content}\n"
            )
        return "\n".join(references)

    async def generate(
        self,
        user_message: str,
        references: RetrieveResult | None = None,
        task_type: str = "技术交底书",
        conversation_id: str | None = None,
        stream: bool = True,
    ) -> AsyncGenerator[str, None]:
        """
        调用 Dify Agent 生成内容

        Dify Agent 内部已配置知识库检索 + Prompt，本方法只负责：
        1. 传递用户消息
        2. 流式/非流式获取回答
        3. 透传引用信息

        Args:
            user_message: 用户消息
            references: 知识库检索结果（可选，Agent 内部也会检索）
            task_type: 文档类型（影响日志标签）
            conversation_id: Dify 会话 ID（用于多轮对话）
            stream: 是否流式输出

        Yields:
            生成的文本片段
        """
        logger.info(
            "llm_generate_start",
            task_type=task_type,
            has_references=references is not None and len(references.chunks) > 0,
            reference_count=len(references.chunks) if references else 0,
            conversation_id=conversation_id,
        )

        if stream:
            # 流式：逐 token yield
            async for event_type, delta, _ in self.dify.chat_messages_stream(
                query=user_message,
                conversation_id=conversation_id,
            ):
                if event_type == "error":
                    logger.error("llm_stream_error", error=delta)
                    raise RuntimeError(f"LLM 流式错误：{delta}")
                if delta:
                    yield delta
                if event_type == "message_end":
                    break
        else:
            # 非流式：一次性返回
            result = await self.dify.chat_messages(
                query=user_message,
                response_mode="blocking",
                conversation_id=conversation_id,
            )
            yield result.answer

    async def generate_sync(
        self,
        user_message: str,
        references: RetrieveResult | None = None,
        task_type: str = "技术交底书",
        conversation_id: str | None = None,
    ) -> tuple[str, str | None, list[RetrievedChunk]]:
        """
        同步生成内容，返回完整回答

        Returns:
            (answer, conversation_id, citations)
        """
        # Agent Chat App 只支持 streaming 模式，用 streaming 收集完整结果后返回
        result = await self.dify.chat_messages(
            query=user_message,
            response_mode="streaming",
            conversation_id=conversation_id,
        )

        # 解析 Dify 返回的 citations，构建 RetrievedChunk 列表
        chunks: list[RetrievedChunk] = []
        for i, cit in enumerate(result.citations):
            chunk = RetrievedChunk(
                content=cit.get("content", cit.get("text", "")),
                source_name=cit.get("document_name", cit.get("source_name", f"引用{i+1}")),
                source_id=cit.get("document_id", ""),
                chunk_id=cit.get("id", ""),
                score=cit.get("score", 0.0),
                position=i,
            )
            chunks.append(chunk)

        return result.answer, result.conversation_id, chunks

    async def health_check(self) -> bool:
        """检查 Dify Agent 可用性"""
        return await self.dify.check_health()
