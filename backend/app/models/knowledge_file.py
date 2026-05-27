"""知识库文件模型"""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.engine import Base


class KnowledgeFile(Base):
    """知识库文件模型（保存文件元数据）"""
    __tablename__ = "knowledge_files"
    __table_args__ = {"schema": "patentwriter"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    # Dify 文档 ID
    dify_document_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    # 关联的知识库配置
    knowledge_config_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patentwriter.knowledge_configs.id"),
        nullable=False
    )
    # 文件名
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    # 文件大小（字节数）
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    # 字数（来自 Dify API）
    word_count: Mapped[int] = mapped_column(Integer, nullable=True)
    # 本地文件路径
    local_path: Mapped[str] = mapped_column(String(1000), nullable=True)
    # 上传时间
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow
    )
    # 更新时间
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # 关系
    knowledge_config = relationship("KnowledgeConfig", back_populates="knowledge_files")
