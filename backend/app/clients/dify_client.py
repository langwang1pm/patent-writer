"""Dify 知识库客户端"""
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

import structlog

logger = structlog.get_logger()


@dataclass
class RetrievedChunk:
    """检索到的片段"""
    content: str
    source_name: str
    source_id: str
    chunk_id: str
    score: float
    position: int = 0


@dataclass
class RetrieveResult:
    """检索结果"""
    chunks: list[RetrievedChunk] = field(default_factory=list)
    source: str = "dify"  # dify | local_fallback | none
    latency_ms: int = 0
    cached: bool = False


class DifyClient:
    """Dify 知识库检索客户端"""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        knowledge_id: str,
        top_k: int = 5,
        score_threshold: float = 0.7,
        rerank: bool = True,
        timeout: int = 3,
        retries: int = 1,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.knowledge_id = knowledge_id
        self.top_k = top_k
        self.score_threshold = score_threshold
        self.rerank = rerank
        self.timeout = timeout
        self.retries = retries

    async def retrieve(
        self,
        query: str,
        knowledge_id: str | None = None,
        top_k: int | None = None,
        score_threshold: float | None = None,
    ) -> RetrieveResult:
        """
        调用 Dify 知识库检索 API
        
        Args:
            query: 检索查询文本
            knowledge_id: 知识库 ID（可选，默认使用实例配置的 ID）
            top_k: 返回片段数（可选）
            score_threshold: 相似度阈值（可选）
        
        Returns:
            RetrieveResult: 检索结果
        """
        start_time = time.time()
        knowledge_id = knowledge_id or self.knowledge_id
        top_k = top_k or self.top_k
        score_threshold = score_threshold or self.score_threshold

        url = f"{self.base_url}/v1/datasets/{knowledge_id}/retrieve"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "query": query,
            "top_k": top_k,
            "score_threshold": score_threshold,
            "rerank_enabled": self.rerank,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            chunks = []
            for i, item in enumerate(data.get("records", [])):
                chunk = RetrievedChunk(
                    content=item.get("content", ""),
                    source_name=item.get("document_name", "未知来源"),
                    source_id=item.get("document_id", ""),
                    chunk_id=item.get("id", ""),
                    score=item.get("score", 0.0),
                    position=i,
                )
                # 过滤低于阈值的片段
                if chunk.score >= score_threshold:
                    chunks.append(chunk)

            latency_ms = int((time.time() - start_time) * 1000)
            logger.info(
                "dify_retrieve_success",
                query_length=len(query),
                chunks_returned=len(chunks),
                latency_ms=latency_ms,
            )

            return RetrieveResult(
                chunks=chunks,
                source="dify",
                latency_ms=latency_ms,
                cached=False,
            )

        except httpx.TimeoutException:
            logger.warning("dify_retrieve_timeout", url=url, timeout=self.timeout)
            raise

        except httpx.HTTPStatusError as e:
            logger.error(
                "dify_retrieve_http_error",
                status_code=e.response.status_code,
                url=url,
            )
            raise

        except Exception as e:
            logger.error("dify_retrieve_error", error=str(e))
            raise

    async def check_health(self) -> bool:
        """健康检查：验证 Dify 服务连通性"""
        try:
            url = f"{self.base_url}/health"
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(url)
                return response.status_code == 200
        except Exception:
            return False

    async def get_dataset_info(self, knowledge_id: str | None = None) -> dict[str, Any] | None:
        """获取知识库信息"""
        knowledge_id = knowledge_id or self.knowledge_id
        url = f"{self.base_url}/v1/datasets/{knowledge_id}"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                return response.json()
        except Exception:
            return None
