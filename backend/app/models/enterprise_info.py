"""企业信息模型"""
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.engine import Base

# 时区配置
CST_TZ = ZoneInfo("Asia/Shanghai")


def now_cst() -> datetime:
    """返回 Asia/Shanghai 时区的当前时间（timezone-aware）"""
    return datetime.now(CST_TZ)


class EnterpriseInfo(Base):
    """企业信息模型（客户企业）"""
    __tablename__ = "enterprise_infos"
    __table_args__ = {"schema": "patentwriter"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="企业名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
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
    project_workspaces: Mapped[list["ProjectWorkspace"]] = relationship(
        "ProjectWorkspace",
        back_populates="enterprise_info"
    )


# 前向引用
from app.models.project_workspace import ProjectWorkspace
