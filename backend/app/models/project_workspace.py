"""项目空间模型"""
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.engine import Base

# 时区配置
CST_TZ = ZoneInfo("Asia/Shanghai")


def now_cst() -> datetime:
    """返回 Asia/Shanghai 时区的当前时间（timezone-aware）"""
    return datetime.now(CST_TZ)


class ProjectWorkspace(Base):
    """项目空间模型"""
    __tablename__ = "project_workspaces"
    __table_args__ = {"schema": "patentwriter"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="项目空间名称")
    enterprise_info_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.enterprise_infos.id", ondelete="RESTRICT"),
        nullable=False,
        comment="客户企业ID"
    )
    task_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.task_types.id", ondelete="RESTRICT"),
        nullable=False,
        comment="任务类型ID"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=now_cst
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=now_cst,
        onupdate=now_cst
    )

    # 关系
    enterprise_info: Mapped["EnterpriseInfo"] = relationship(
        "EnterpriseInfo",
        back_populates="project_workspaces"
    )
    task_type: Mapped["TaskType"] = relationship(
        "TaskType",
        back_populates="project_workspaces"
    )


# 前向引用
from app.models.enterprise_info import EnterpriseInfo
from app.models.task_type import TaskType
