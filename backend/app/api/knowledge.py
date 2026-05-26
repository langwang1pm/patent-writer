"""知识库配置 API"""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.knowledge_config import KnowledgeConfig
from app.schemas.knowledge import (
    KnowledgeConfigCreate,
    KnowledgeConfigUpdate,
    KnowledgeConfigResponse,
    KnowledgeConfigListResponse,
    KnowledgeConfigTestRequest,
    KnowledgeConfigTestResponse,
)

router = APIRouter()


@router.get("/knowledge/configs", response_model=KnowledgeConfigListResponse)
async def list_knowledge_configs(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """获取知识库配置列表"""
    result = await db.execute(
        select(KnowledgeConfig).order_by(KnowledgeConfig.created_at.desc())
    )
    configs = result.scalars().all()

    # 找到默认配置
    default_config = next((c for c in configs if c.is_default), None)

    return KnowledgeConfigListResponse(
        items=configs,
        total=len(configs),
        default_id=default_config.id if default_config else None,
    )


@router.post("/knowledge/configs", response_model=KnowledgeConfigResponse, status_code=201)
async def create_knowledge_config(
    data: KnowledgeConfigCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """创建知识库配置"""
    # 如果设为默认，先取消其他默认
    if data.is_default:
        result = await db.execute(
            select(KnowledgeConfig).where(KnowledgeConfig.is_default == True)
        )
        for config in result.scalars().all():
            config.is_default = False

    config = KnowledgeConfig(
        name=data.name,
        dify_base_url=data.dify_base_url,
        dify_api_key=data.dify_api_key,
        knowledge_id=data.knowledge_id,
        top_k=data.top_k,
        score_threshold=data.score_threshold,
        rerank_enabled=data.rerank_enabled,
        is_default=data.is_default,
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return config


@router.get("/knowledge/configs/{config_id}", response_model=KnowledgeConfigResponse)
async def get_knowledge_config(
    config_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """获取知识库配置详情"""
    result = await db.execute(
        select(KnowledgeConfig).where(KnowledgeConfig.id == config_id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    return config


@router.put("/knowledge/configs/{config_id}", response_model=KnowledgeConfigResponse)
async def update_knowledge_config(
    config_id: uuid.UUID,
    data: KnowledgeConfigUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """更新知识库配置"""
    result = await db.execute(
        select(KnowledgeConfig).where(KnowledgeConfig.id == config_id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    # 如果设为默认，先取消其他默认
    if data.is_default is True:
        other_result = await db.execute(
            select(KnowledgeConfig).where(
                KnowledgeConfig.is_default == True,
                KnowledgeConfig.id != config_id
            )
        )
        for other_config in other_result.scalars().all():
            other_config.is_default = False

    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    await db.flush()
    await db.refresh(config)
    return config


@router.delete("/knowledge/configs/{config_id}", status_code=204)
async def delete_knowledge_config(
    config_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """删除知识库配置"""
    result = await db.execute(
        select(KnowledgeConfig).where(KnowledgeConfig.id == config_id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    await db.delete(config)
    return None


@router.post("/knowledge/configs/{config_id}/test", response_model=KnowledgeConfigTestResponse)
async def test_knowledge_config(
    config_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    测试知识库连接
    
    TODO: 实现真正的 Dify 连接测试
    """
    import time
    result = await db.execute(
        select(KnowledgeConfig).where(KnowledgeConfig.id == config_id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    # TODO: 实际调用 Dify API 测试连接
    start_time = time.time()

    # 模拟测试结果
    return KnowledgeConfigTestResponse(
        success=True,
        message="连接成功",
        document_count=None,
        latency_ms=int((time.time() - start_time) * 1000),
    )
