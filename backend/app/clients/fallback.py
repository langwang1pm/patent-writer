"""降级策略管理器"""
import structlog
from typing import Protocol

from app.clients.dify_client import DifyClient, RetrieveResult

logger = structlog.get_logger()


class RetrievalStrategy(Protocol):
    """检索策略协议"""

    async def retrieve(self, query: str, **kwargs) -> RetrieveResult:
        """执行检索"""
        ...


class DifyRetrievalStrategy:
    """Dify 检索策略"""

    def __init__(self, client: DifyClient):
        self.client = client

    async def retrieve(self, query: str, **kwargs) -> RetrieveResult:
        """执行 Dify 检索"""
        return await self.client.retrieve(
            query,
            knowledge_id=kwargs.get("knowledge_id"),
            top_k=kwargs.get("top_k"),
            score_threshold=kwargs.get("score_threshold"),
        )


class LocalFallbackStrategy:
    """本地知识库降级策略（开发测试用）"""

    def __init__(self, local_path: str | None = None):
        self.local_path = local_path
        self._documents: list[dict] = []

    async def retrieve(self, query: str, **kwargs) -> RetrieveResult:
        """
        简单的关键词匹配降级策略
        
        注意：这是简化实现，生产环境应使用更复杂的全文检索
        """
        import time

        start_time = time.time()
        chunks = []

        # 简单的关键词匹配
        query_words = set(query.lower().split())

        for doc in self._documents:
            content = doc.get("content", "").lower()
            # 计算简单相似度
            matched_words = sum(1 for word in query_words if word in content)
            if matched_words > 0:
                score = matched_words / len(query_words)
                chunks.append(
                    {
                        "content": doc.get("content", ""),
                        "source_name": doc.get("name", "本地文档"),
                        "source_id": doc.get("id", ""),
                        "chunk_id": doc.get("id", ""),
                        "score": score,
                    }
                )

        # 按相似度排序
        chunks.sort(key=lambda x: x["score"], reverse=True)
        chunks = chunks[: kwargs.get("top_k", 5)]

        latency_ms = int((time.time() - start_time) * 1000)
        logger.warning(
            "local_fallback_retrieve",
            query=query[:50],
            chunks_returned=len(chunks),
        )

        return RetrieveResult(
            chunks=chunks,
            source="local_fallback",
            latency_ms=latency_ms,
            cached=False,
        )

    def add_document(self, name: str, content: str, doc_id: str | None = None) -> None:
        """添加本地文档"""
        self._documents.append({
            "id": doc_id or f"local_{len(self._documents)}",
            "name": name,
            "content": content,
        })


class FallbackManager:
    """
    降级链路管理器
    
    优先级：
    1. 主 Dify 实例 → 正常检索
    2. 备用 Dify 实例 → 切换到备用地址
    3. 本地知识库 → 简单关键词匹配
    4. 无知识库 → 仅 LLM 生成，不标注引用
    """

    def __init__(self):
        self.strategies: list[RetrievalStrategy] = []
        self.local_fallback = LocalFallbackStrategy()

    def add_dify(self, client: DifyClient) -> None:
        """添加 Dify 策略"""
        self.strategies.append(DifyRetrievalStrategy(client))

    def add_local(self, local_path: str | None = None) -> None:
        """添加本地降级策略"""
        self.local_fallback = LocalFallbackStrategy(local_path)
        self.strategies.append(self.local_fallback)

    async def retrieve_with_fallback(
        self,
        query: str,
        **kwargs
    ) -> RetrieveResult:
        """
        按优先级尝试检索，直到成功或有结果
        
        Returns:
            RetrieveResult: 检索结果（可能是空的）
        """
        # 尝试 Dify 策略
        for strategy in self.strategies:
            if isinstance(strategy, LocalFallbackStrategy):
                continue  # 本地策略作为最后降级

            try:
                result = await strategy.retrieve(query, **kwargs)
                if result.chunks:
                    return result
            except Exception as e:
                logger.warning(
                    "retrieval_strategy_failed",
                    strategy=type(strategy).__name__,
                    error=str(e),
                )
                continue

        # 尝试本地降级
        try:
            result = await self.local_fallback.retrieve(query, **kwargs)
            if result.chunks:
                return result
        except Exception as e:
            logger.warning("local_fallback_failed", error=str(e))

        # 无结果
        return RetrieveResult(source="none", chunks=[])
