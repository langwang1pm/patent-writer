"""项目空间模型"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.engine import Base


class ProjectWorkspace(Base):
    """项目空间模型"""
    __tablename__ = "project_workspace"
    __table_args__ = {"schema": "patentwriter"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    workspace_name: Mapped[str] = mapped_column(String(255), nullable=False, comment="项目空间名称")
    enterprise_info_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.enterprise_info.id", ondelete="RESTRICT"),
        nullable=False,
        comment="客户企业ID"
    )
    task_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.task_type.id", ondelete="RESTRICT"),
        nullable=False,
        comment="任务类型ID"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=func.now(),
        onupdate=func.now()
    )

    # 关系
    enterprise_info: Mapped["EnterpriseInfo"] = relationship(
        "EnterpriseInfo",
        back_populates="project_workspace",
        primaryjoin="ProjectWorkspace.enterprise_info_id == EnterpriseInfo.id"
    )
    task_type: Mapped["TaskType"] = relationship(
        "TaskType",
        back_populates="project_workspace",
        primaryjoin="ProjectWorkspace.task_type_id == TaskType.id"
    )


# 前向引用
from app.models.enterprise_info import EnterpriseInfo
from app.models.task_type import TaskType
