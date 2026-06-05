"""项目空间 Schema"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

# 显式导入关联对象的 Schema，避免前向引用解析失败
from app.schemas.enterprise_info import EnterpriseInfoResponse
from app.schemas.task_type import TaskTypeResponse


class ProjectWorkspaceBase(BaseModel):
    """项目空间基础 Schema"""
    name: str = Field(..., description="项目空间名称")
    enterprise_info_id: UUID = Field(..., description="客户企业ID")
    task_type_id: UUID = Field(..., description="任务类型ID")


class ProjectWorkspaceCreate(ProjectWorkspaceBase):
    """创建项目空间"""
    pass


class ProjectWorkspaceUpdate(BaseModel):
    """更新项目空间（部分字段可选）"""
    name: str | None = Field(None, description="项目空间名称")
    enterprise_info_id: UUID | None = Field(None, description="客户企业ID")
    task_type_id: UUID | None = Field(None, description="任务类型ID")


class ProjectWorkspaceInDB(ProjectWorkspaceBase):
    """数据库中项目空间（含 ID 和时间戳）"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectWorkspaceResponse(ProjectWorkspaceInDB):
    """项目空间响应（含关联对象）"""
    enterprise_info: EnterpriseInfoResponse | None = None
    task_type: TaskTypeResponse | None = None


class ProjectWorkspaceWithRelations(ProjectWorkspaceInDB):
    """项目空间响应（含关联对象详情）"""
    enterprise_info: EnterpriseInfoResponse
    task_type: TaskTypeResponse

    class Config:
        from_attributes = True
