"""数据库引擎配置"""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import get_settings

settings = get_settings()

# 调试：打印数据库 URL
print("=" * 80)
print("DATABASE_URL from .env:", settings.database_url)
print("decoded_database_url:", settings.decoded_database_url)
print("async_database_url:", settings.async_database_url)
print("=" * 80)

# 同步引擎（用于 Alembic 迁移，直接使用 database_url）
sync_engine = create_engine(
    settings.database_url,  # 直接使用，不解码
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.debug,
)

# 设置 schema
@event.listens_for(sync_engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute(f"SET search_path TO {settings.database_schema}")
    cursor.close()


# 异步引擎（用于应用）
engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),  # 直接替换协议
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.debug,
)


@event.listens_for(sync_engine, "connect")
def set_search_path_async(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute(f"SET search_path TO {settings.database_schema}")
    cursor.close()


# Base 类
Base = declarative_base()

# 异步会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)