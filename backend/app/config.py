"""应用配置管理"""
from functools import lru_cache
from urllib.parse import quote_plus, unquote_plus
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # 数据库连接串（优先使用，支持 URL 编码的密码）
    database_url: str = ""
    database_schema: str = "patentwriter"

    # Redis 配置
    redis_url: str | None = None

    # Dify 配置
    dify_base_url: str = "http://localhost:5001"
    dify_api_key: str = ""
    dify_knowledge_id: str = ""

    # 检索参数
    retrieval_top_k: int = 5
    score_threshold: float = 0.7
    rerank_enabled: bool = True

    # Dify 超时配置
    dify_timeout_s: int = 3
    dify_retries: int = 1

    # LLM 配置
    llm_max_tokens: int = 4096
    stream_enabled: bool = True

    # 应用配置
    app_port: int = 8000
    app_host: str = "0.0.0.0"
    debug: bool = False

    @property
    def decoded_database_url(self) -> str:
        """解码 DATABASE_URL 中的密码部分（URL 编码 → 原始字符）"""
        if not self.database_url:
            return ""
        # 处理 URL 编码的密码：postgres://user:pass@host/db
        # 密码中的 %XX 需要还原为原始字符才能用于 asyncpg
        if "://" in self.database_url:
            prefix, rest = self.database_url.split("://", 1)
            if "@" in rest:
                creds, host_part = rest.split("@", 1)
                if ":" in creds:
                    user, encoded_pass = creds.split(":", 1)
                    # 解码密码中的 %XX
                    decoded_pass = unquote_plus(encoded_pass)
                    return f"{prefix}://{user}:{decoded_pass}@{host_part}"
        return self.database_url

    @property
    def async_database_url(self) -> str:
        """SQLAlchemy asyncpg 连接串（使用解码后的 URL）"""
        return self.decoded_database_url.replace(
            "postgresql://", "postgresql+asyncpg://"
        )


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()