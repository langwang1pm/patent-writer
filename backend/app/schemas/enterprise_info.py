"""企业信息 Schema"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class EnterpriseInfoBase(BaseModel):
    """企业信息基础 Schema"""
    enterprise_name: str = Field(..., description="企业全称")
    description: str | None = Field(None, description="描述")


class EnterpriseInfoCreate(EnterpriseInfoBase):
    """创建企业信息"""
    pass


class EnterpriseInfoUpdate(BaseModel):
    """更新企业信息（部分字段可选）"""
    enterprise_name: str | None = Field(None, description="企业全称")
    description: str | None = Field(None, description="描述")


class EnterpriseInfoInDB(EnterpriseInfoBase):
    """数据库中企业信息（含 ID 和时间戳）"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EnterpriseInfoResponse(EnterpriseInfoInDB):
    """企业信息响应"""
    pass
