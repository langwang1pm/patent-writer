"""LLM 服务"""
import structlog
from typing import AsyncGenerator

from app.clients.dify_client import RetrieveResult

logger = structlog.get_logger()


# 专利文档类型的 Prompt 模板
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
    
    MVP：通过 Dify 的 /chat-messages API 调用
    扩展：支持直连外部 LLM API
    """

    def __init__(self, dify_base_url: str, dify_api_key: str):
        self.dify_base_url = dify_base_url
        self.dify_api_key = dify_api_key

    def build_system_prompt(self, task_type: str) -> str:
        """根据任务类型构建 Prompt"""
        return PATENT_DOCUMENT_TEMPLATES.get(task_type, PATENT_DOCUMENT_TEMPLATES["技术交底书"])

    def build_references_text(self, retrieve_result: RetrieveResult) -> str:
        """构建参考知识库文本"""
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
        conversation_history: list[dict] | None = None,
        stream: bool = True,
    ) -> AsyncGenerator[str, None]:
        """
        调用 LLM 生成内容
        
        TODO: 实现真正的 LLM 调用
        当前为模拟实现
        
        Args:
            user_message: 用户消息
            references: 知识库检索结果
            task_type: 文档类型
            conversation_history: 对话历史
            stream: 是否流式输出
        
        Yields:
            生成的文本片段
        """
        # 构建 Prompt
        references_text = self.build_references_text(references or RetrieveResult())
        system_prompt = self.build_system_prompt(task_type).format(
            references=references_text,
            user_message=user_message,
        )

        logger.info(
            "llm_generate_start",
            task_type=task_type,
            has_references=references is not None and len(references.chunks) > 0,
            reference_count=len(references.chunks) if references else 0,
        )

        # TODO: 实现真正的 LLM 调用
        # 当前返回模拟内容
        if stream:
            content = f"""根据您的需求，已生成{task_type}：

一、技术领域
本发明涉及人工智能领域，特别涉及一种基于深度学习的图像识别方法。

二、背景技术[①]
现有技术中，图像识别主要依赖于传统的机器学习方法，如SVM、随机森林等。这些方法在处理复杂图像时准确率较低，且泛化能力有限。

三、发明内容
本发明的目的在于提供一种基于深度学习的图像识别方法，以解决现有技术中准确率低、泛化能力差的问题。

[①] 请在知识库中添加相关专利文档以获取更准确的引用"""
            for char in content:
                yield char
        else:
            yield f"已生成{task_type}（非流式模式）"

    async def generate_sync(
        self,
        user_message: str,
        references: RetrieveResult | None = None,
        task_type: str = "技术交底书",
    ) -> str:
        """同步生成内容"""
        result = []
        async for chunk in self.generate(user_message, references, task_type, stream=True):
            result.append(chunk)
        return "".join(result)
