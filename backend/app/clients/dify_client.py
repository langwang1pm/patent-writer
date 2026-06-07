"""Dify 知识库客户端"""
import json
import time
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator

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


@dataclass
class DifyMessage:
    """Dify 聊天消息"""
    message_id: str = ""
    conversation_id: str = ""
    answer: str = ""
    citations: list[dict] = field(default_factory=list)  # Dify 返回的引用列表
    metadata: dict = field(default_factory=dict)


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

    async def chat_messages(
        self,
        query: str,
        user_id: str = "patent-writer",
        conversation_id: str | None = None,
        response_mode: str = "streaming",
        timeout: int = 120,
        inputs: dict[str, str] | None = None,
    ) -> DifyMessage:
        """
        调用 Dify 对话型应用（Agent）API

        Args:
            query: 用户消息
            user_id: 用户标识
            conversation_id: 对话 ID（续接会话）
            response_mode: blocking | streaming
            timeout: 超时秒数
            inputs: Dify 应用变量（如 companyId, tasktypeId），默认 {}

        Returns:
            DifyMessage: 包含回答和引用的消息对象
        """
        url = f"{self.base_url}/v1/chat-messages"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "query": query,
            "inputs": inputs or {},
            "response_mode": response_mode,
            "user": user_id,
        }
        if conversation_id:
            payload["conversation_id"] = conversation_id

        logger.info("dify_chat_start", query=query[:50], response_mode=response_mode)

        try:
            if response_mode == "blocking":
                # 非流式：等待完整响应（读取超时放宽）
                httpx_timeout = httpx.Timeout(connect=10.0, read=timeout * 10, write=30.0, pool=5.0)
                async with httpx.AsyncClient(timeout=httpx_timeout) as client:
                    response = await client.post(url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()

                return DifyMessage(
                    message_id=data.get("message_id", ""),
                    conversation_id=data.get("conversation_id", ""),
                    answer=data.get("answer", ""),
                    citations=data.get("citations", []),
                    metadata=data,
                )

            else:
                # 流式：SSE，收集所有 answer 片段后合并返回
                full_answer = []
                msg_id = ""
                conv_id = ""
                citations = []

                httpx_timeout = httpx.Timeout(connect=10.0, read=None, write=30.0, pool=5.0)
                async with httpx.AsyncClient(timeout=httpx_timeout) as client:
                    async with client.stream("POST", url, json=payload, headers=headers) as resp:
                        resp.raise_for_status()
                        async for line in resp.aiter_lines():
                            if not line.startswith("data: "):
                                continue
                            raw = line[6:].strip()
                            if not raw or raw == "[DONE]":
                                continue
                            try:
                                event = json.loads(raw)
                            except json.JSONDecodeError:
                                continue

                            etype = event.get("event", "")
                            # agent_message / message：包含增量文本
                            if etype in ("agent_message", "message"):
                                delta = event.get("answer", "")
                                if delta:
                                    full_answer.append(delta)
                                if not msg_id:
                                    msg_id = event.get("message_id", "")
                            # message_end：包含引用信息
                            elif etype == "message_end":
                                msg_id = event.get("message_id", msg_id)
                                conv_id = event.get("conversation_id", conv_id)
                                # Dify 的引用通常在 metadata 或 task 字段
                                task = event.get("task", {})
                                metadata = task.get("metadata", {})
                                citations = metadata.get("citations", [])

                answer = "".join(full_answer)
                logger.info(
                    "dify_chat_stream_done",
                    answer_len=len(answer),
                    citations_count=len(citations),
                )

                return DifyMessage(
                    message_id=msg_id,
                    conversation_id=conv_id,
                    answer=answer,
                    citations=citations,
                    metadata={"response_mode": "streaming"},
                )

        except httpx.TimeoutException:
            logger.error("dify_chat_timeout", timeout=timeout)
            raise RuntimeError(f"Dify 请求超时（{timeout}s）")
        except httpx.HTTPStatusError as e:
            logger.error("dify_chat_http_error", status=e.response.status_code, detail=e.response.text[:200])
            raise RuntimeError(f"Dify HTTP 错误：{e.response.status_code}")
        except Exception as e:
            logger.error("dify_chat_error", error=str(e))
            raise RuntimeError(f"Dify 调用失败：{e}")

    async def chat_messages_stream(
        self,
        query: str,
        user_id: str = "patent-writer",
        conversation_id: str | None = None,
        timeout: int = 120,
        inputs: dict[str, str] | None = None,
    ) -> AsyncGenerator[tuple[str, str, dict], None]:
        """
        流式调用 Dify Agent，SSE 逐事件 yield

        Args:
            query: 用户消息
            user_id: 用户标识
            conversation_id: 对话 ID（续接会话）
            timeout: 超时秒数
            inputs: Dify 应用变量（如 companyId, tasktypeId），默认 {}

        Yields:
            (event_type, delta/answer, extra_data)
        """
        url = f"{self.base_url}/v1/chat-messages"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "query": query,
            "inputs": inputs or {},
            "response_mode": "streaming",
            "user": user_id,
        }
        if conversation_id:
            payload["conversation_id"] = conversation_id

        try:
            # 细粒度超时：连接10s，读取不限（流式长生成需要）
            httpx_timeout = httpx.Timeout(connect=10.0, read=None, write=30.0, pool=5.0)
            async with httpx.AsyncClient(timeout=httpx_timeout) as client:
                async with client.stream("POST", url, json=payload, headers=headers) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[6:].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            event = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        # ── TEMP LOG ── write raw SSE event to C:\temp\dify_sse_events.jsonl ──
                        import os as _os_
                        _log_dir = r"C:\temp"
                        _os_.makedirs(_log_dir, exist_ok=True)
                        with open(_os_.path.join(_log_dir, "dify_sse_events.jsonl"), "a", encoding="utf-8") as _lf:
                            _lf.write(json.dumps(event, ensure_ascii=False) + "\n")

                        etype = event.get("event", "")

                        # agent_message / message: delta text
                        if etype in ("agent_message", "message"):
                            yield (etype, event.get("answer", ""), event)
                        elif etype == "message_end":
                            # Try to extract citation data from multiple possible locations
                            citations_data = (
                                event.get("metadata", {}).get("citations")
                                or event.get("retriever_resources")
                                or []
                            )
                            event["_citations"] = citations_data
                            yield ("message_end", "", event)
                        elif etype == "error":
                            yield ("error", event.get("message", ""), {})
        except Exception as e:
            # 检查是否是正常的连接关闭（不是真正的错误）
            error_str = str(e)
            error_type = type(e).__name__
            logger.info("dify_stream_exception", error_type=error_type, error_message=error_str)
            
            if any(keyword in error_str.lower() for keyword in [
                'connection closed', 'stream ended', 'closed',
                'connectionreseterror', 'broken pipe'
            ]):
                logger.info("dify_stream_normal_close", message="SSE 连接正常关闭")
                return  # 正常结束，不 yield error
            
            logger.error("dify_chat_stream_error", error=error_str, error_type=error_type)
            yield ("error", error_str, {})

    async def get_message(self, message_id: str) -> dict[str, Any] | None:
        """获取 Dify 消息详情（含 retriever_resources）
        
        SSE 流的 message_end 事件中 retriever_resources 可能为空，
        但通过 Messages REST API 可以获取完整的检索来源数据。
        """
        url = f"{self.base_url}/v1/messages/{message_id}"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                # 提取 retrieval_resources（Dify 不同版本字段名不同）
                resources = (
                    data.get("retriever_resources")
                    or data.get("retrieval_resources")
                    or []
                )
                logger.info(
                    "dify_get_message",
                    message_id=message_id,
                    resources_count=len(resources),
                )
                # 同时写日志文件方便调试
                import os as _os_
                _log_dir = r"C:\temp"
                _os_.makedirs(_log_dir, exist_ok=True)
                with open(_os_.path.join(_log_dir, "dify_message_api.json"), "w", encoding="utf-8") as _lf:
                    json.dump(data, _lf, ensure_ascii=False, indent=2)
                return data
        except Exception as e:
            logger.error("dify_get_message_error", error=str(e), message_id=message_id)
            return None

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
