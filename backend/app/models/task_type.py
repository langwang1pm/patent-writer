"""任务类型模型"""
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import String, Text, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.engine import Base

# 时区配置
CST_TZ = ZoneInfo("Asia/Shanghai")


def now_cst() -> datetime:
    """返回 Asia/Shanghai 时区的当前时间（timezone-aware）"""
    return datetime.now(CST_TZ)


class TaskType(Base):
    """任务类型模型（要编写的文档类型）"""
    __tablename__ = "task_type"
    __table_args__ = {"schema": "patentwriter"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    task_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="类型名称，例如：合同、报告")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="类型说明")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用：true启用，false停用")
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
    project_workspace: Mapped["ProjectWorkspace"] = relationship(
        "ProjectWorkspace",
        back_populates="task_type",
        primaryjoin="TaskType.id == ProjectWorkspace.task_type_id"
    )


# 前向引用
from app.models.project_workspace import ProjectWorkspace
