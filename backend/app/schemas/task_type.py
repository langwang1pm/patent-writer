"""任务类型 Schema"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class TaskTypeBase(BaseModel):
    """任务类型基础 Schema"""
    task_name: str = Field(..., description="类型名称，例如：合同、报告")
    description: str | None = Field(None, description="类型说明")
    is_active: bool = Field(True, description="是否启用：true启用，false停用")


class TaskTypeCreate(TaskTypeBase):
    """创建任务类型"""
    pass


class TaskTypeUpdate(BaseModel):
    """更新任务类型（部分字段可选）"""
    task_name: str | None = Field(None, description="类型名称")
    description: str | None = Field(None, description="类型说明")
    is_active: bool | None = Field(None, description="是否启用")


class TaskTypeInDB(TaskTypeBase):
    """数据库中任务类型（含 ID 和时间戳）"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskTypeResponse(TaskTypeInDB):
    """任务类型响应"""
    pass
