"""FastAPI 应用入口"""
import asyncio
import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.engine import engine, Base
from app.api import conversations, documents, citations, knowledge, knowledge_files, onlyoffice, project_workspaces, task_types, enterprise_infos

# 配置日志
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("application_startup", version=get_settings().model_fields_set)

    # 启动时创建数据库表(开发环境)
    if get_settings().debug:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    yield

    logger.info("application_shutdown")
    await engine.dispose()


app = FastAPI(
    title="智撰 PatentWriter API",
    description="通过对话方式辅助编写专利文档,实时引用 Dify 知识库内容",
    version="0.1.0",
    lifespan=lifespan,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(conversations.router, prefix="/api/v1", tags=["对话管理"])
app.include_router(documents.router, prefix="/api/v1", tags=["文档管理"])
app.include_router(citations.router, prefix="/api/v1", tags=["引用管理"])
app.include_router(knowledge.router, prefix="/api/v1", tags=["知识库配置"])
app.include_router(knowledge_files.router, prefix="/api/v1", tags=["知识库文件管理"])
app.include_router(onlyoffice.router, prefix="/api/v1", tags=["OnlyOffice 文档预览"])
app.include_router(project_workspaces.router, prefix="/api/v1/project-workspaces", tags=["项目空间管理"])
app.include_router(task_types.router, prefix="/api/v1/task-types", tags=["任务类型管理"])
app.include_router(enterprise_infos.router, prefix="/api/v1/enterprise-infos", tags=["企业信息管理"]) 


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "patent-writer-backend"}


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": "智撰 PatentWriter API",
        "version": "0.1.0",
        "docs": "/docs",
    }
