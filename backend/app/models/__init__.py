"""数据模型层"""
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models.knowledge_config import KnowledgeConfig
from app.models.knowledge_file import KnowledgeFile
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.citation import Citation
from app.models.task_type import TaskType
from app.models.enterprise_info import EnterpriseInfo
from app.models.project_workspace import ProjectWorkspace

CST_TZ = ZoneInfo("Asia/Shanghai")


def now_cst() -> datetime:
    """返回 Asia/Shanghai 时区的当前时间（timezone-aware，UTC 等价）
    
    返回带 UTC 时区的 datetime，SQLAlchemy DateTime(timezone=True)
    会将其正确写入 PostgreSQL，无需手动偏移。
    """
    return datetime.now(CST_TZ)
