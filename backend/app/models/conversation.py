"""对话和消息模型"""
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.engine import Base

# 时区配置
CST_TZ = ZoneInfo("Asia/Shanghai")


def now_cst() -> datetime:
    """返回 Asia/Shanghai 时区的当前时间（timezone-aware）"""
    return datetime.now(CST_TZ)


class MessageRole(str, enum.Enum):
    """消息角色"""
    USER = "user"
    ASSISTANT = "assistant"


class Conversation(Base):
    """对话模型"""
    __tablename__ = "conversations"
    __table_args__ = {"schema": "patentwriter"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="新对话")
    knowledge_config_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.knowledge_configs.id"),
        nullable=True
    )
    # 项目空间关联
    project_workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.project_workspace.id", ondelete="SET NULL"),
        nullable=True,
        comment="所属项目空间ID"
    )
    # 冗余字段：从项目空间自动填充，避免频繁 JOIN
    enterprise_info_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.enterprise_info.id", ondelete="RESTRICT"),
        nullable=True,
        comment="客户企业ID（冗余自项目空间）"
    )
    task_type_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.task_type.id", ondelete="RESTRICT"),
        nullable=True,
        comment="任务类型ID（冗余自项目空间）"
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
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="conversation",
        cascade="all, delete-orphan"
    )
    project_workspace: Mapped["ProjectWorkspace | None"] = relationship(
        "ProjectWorkspace",
        back_populates="conversations",
        primaryjoin="Conversation.project_workspace_id == ProjectWorkspace.id"
    )
    enterprise_info: Mapped["EnterpriseInfo | None"] = relationship(
        "EnterpriseInfo",
        back_populates="conversations",
        primaryjoin="Conversation.enterprise_info_id == EnterpriseInfo.id"
    )
    task_type: Mapped["TaskType | None"] = relationship(
        "TaskType",
        back_populates="conversations",
        primaryjoin="Conversation.task_type_id == TaskType.id"
    )


class Message(Base):
    """消息模型"""
    __tablename__ = "messages"
    __table_args__ = {"schema": "patentwriter"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.conversations.id", ondelete="CASCADE"),
        nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.documents.id"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=now_cst
    )

    # 关系
    conversation: Mapped["Conversation"] = relationship(
        "Conversation",
        back_populates="messages"
    )
    document: Mapped["Document | None"] = relationship("Document")


# 前向引用
from app.models.document import Document
