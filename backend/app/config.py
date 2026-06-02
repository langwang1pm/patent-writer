"""应用配置管理"""
from functools import lru_cache
from urllib.parse import quote_plus, unquote_plus
from pydantic import model_validator
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

    # 分散式数据库配置（DATABASE_URL 未设置时自动拼装）
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "patentwriter"
    database_user: str = ""
    database_password: str = ""

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

    # OnlyOffice Document Server 配置
    onlyoffice_doc_server_url: str = "http://localhost:8080"  # OnlyOffice 文档服务器地址（前端访问）
    onlyoffice_secret: str = ""  # JWT 密钥（留空则不签名）
    onlyoffice_callback_url: str = "http://localhost:8000"  # OnlyOffice 回调地址（Document Server 访问后端的地址）

    # 应用配置
    app_port: int = 8000
    app_host: str = "0.0.0.0"
    debug: bool = False

    @model_validator(mode="after")
    def _build_database_url_if_missing(self) -> "Settings":
        """DATABASE_URL 为空时，用分散变量拼装连接串"""
        if not self.database_url:
            from urllib.parse import quote_plus
            pw = quote_plus(self.database_password) if self.database_password else ""
            if self.database_user:
                self.database_url = f"postgresql://{self.database_user}:{pw}@{self.database_host}:{self.database_port}/{self.database_name}"
            else:
                self.database_url = f"postgresql://{self.database_host}:{self.database_port}/{self.database_name}"
        return self

    @property
    def decoded_database_url(self) -> str:
        """返回 DATABASE_URL（确保密码部分已正确 URL 编码）"""
        # pydantic-settings 读取 .env 时可能已对值做 URL 解码，
        # 导致密码中的特殊字符（@ : / [ ] ( ) = 等）暴露，SQLAlchemy 解析失败。
        # 此处重新编码，确保传给 SQLAlchemy 的 URL 是合法的。
        return _ensure_encoded_url(self.database_url)

    @property
    def async_database_url(self) -> str:
        """SQLAlchemy asyncpg 连接串（密码保持 URL 编码）"""
        return _ensure_encoded_url(self.database_url).replace(
            "postgresql://", "postgresql+asyncpg://"
        )


def _ensure_encoded_url(url: str) -> str:
    """确保 PostgreSQL URL 中密码部分已正确 URL 编码。
    
    如果 pydantic-settings 已对 .env 值做 URL 解码，
    则解析各组件后重新拼装并返回编码后的 URL。
    """
    from urllib.parse import quote_plus, urlparse, urlunparse

    parsed = urlparse(url)
    if not parsed.password:
        return url  # 无密码或已无法解析，原样返回
    # 如果密码中包含特殊字符（@ : / [ ] ( ) 等），说明未编码，需要重新编码
    # 判断依据：密码解码后仍等于自身（即不含 %XX），但包含特殊字符
    decoded_pw = unquote_plus(parsed.password)
    if decoded_pw == parsed.password:
        # 密码未编码（是明文），需要编码
        encoded_pw = quote_plus(parsed.password)
        # 重新拼装 URL（用户名密码部分）
        from urllib.parse import urlunparse
        # 用 netloc 重建：userinfo@host:port
        userinfo = parsed.username or ""
        if encoded_pw:
            userinfo = f"{userinfo}:{encoded_pw}" if userinfo else encoded_pw
        # 更简单的做法：直接替换 password 部分
        # 用 urllib.parse 的 _replace 不行，手动拼
        new_netloc = f"{parsed.username}:{quote_plus(parsed.password)}@{parsed.hostname}"
        if parsed.port:
            new_netloc += f":{parsed.port}"
        new_parsed = parsed._replace(netloc=new_netloc)
        return urlunparse(new_parsed)
    # 密码已编码，原样返回
    return url


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()