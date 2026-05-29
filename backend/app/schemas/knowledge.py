"""知识库配置相关 Pydantic Schema"""
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl
from app.schemas._datetime import CstDatetime


class KnowledgeConfigBase(BaseModel):
    """知识库配置基础 Schema"""
    name: str = Field(..., min_length=1, max_length=255)
    dify_base_url: str = Field(..., description="Dify 服务地址")
    dify_api_key: str = Field(..., description="Dify API Key")
    knowledge_id: str = Field(..., description="Dify 知识库 ID")
    top_k: int = Field(5, ge=1, le=20, description="检索返回片段数")
    score_threshold: float = Field(0.7, ge=0.0, le=1.0, description="相似度阈值")
    rerank_enabled: bool = Field(True, description="是否启用重排序")
    indexing_technique: str = Field("economy", pattern="^(economy|high_quality)$", description="索引模式: economy(关键词匹配,无需Embedding) | high_quality(向量检索,需Embedding模型)")


class KnowledgeConfigCreate(KnowledgeConfigBase):
    """创建知识库配置"""
    is_default: bool = Field(False, description="是否设为默认")


class KnowledgeConfigUpdate(BaseModel):
    """更新知识库配置"""
    name: str | None = Field(None, min_length=1, max_length=255)
    dify_base_url: str | None = None
    dify_api_key: str | None = None
    knowledge_id: str | None = None
    top_k: int | None = Field(None, ge=1, le=20)
    score_threshold: float | None = Field(None, ge=0.0, le=1.0)
    rerank_enabled: bool | None = None
    indexing_technique: str | None = Field(None, pattern="^(economy|high_quality)$")
    is_default: bool | None = None
    status: str | None = Field(None, pattern="^(active|inactive)$")


class KnowledgeConfigResponse(KnowledgeConfigBase):
    """知识库配置响应"""
    id: UUID
    is_default: bool
    status: str
    created_at: CstDatetime
    updated_at: CstDatetime

    model_config = {"from_attributes": True}


class KnowledgeConfigTestRequest(BaseModel):
    """测试连接请求"""
    dify_base_url: str
    dify_api_key: str
    knowledge_id: str


class KnowledgeConfigTestResponse(BaseModel):
    """测试连接响应"""
    success: bool
    message: str
    document_count: int | None = None
    latency_ms: int | None = None


class KnowledgeConfigListResponse(BaseModel):
    """知识库配置列表响应"""
    items: list[KnowledgeConfigResponse]
    total: int
    default_id: UUID | None = None
