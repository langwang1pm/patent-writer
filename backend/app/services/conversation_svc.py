"""对话服务"""
import uuid
import structlog
from datetime import datetime
from app.models import now_cst

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.conversation import Conversation, Message
from app.models.document import Document

logger = structlog.get_logger()


class ConversationService:
    """对话业务服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_conversation(
        self,
        title: str = "新对话",
        knowledge_config_id: uuid.UUID | None = None,
        project_workspace_id: uuid.UUID | None = None,
    ) -> Conversation:
        """创建对话
        
        如果传入 project_workspace_id，自动从项目空间填充：
        - enterprise_info_id（客户企业ID）
        - task_type_id（任务类型ID）
        """
        # 从项目空间自动填充企业ID和任务类型ID
        enterprise_info_id = None
        task_type_id = None
        
        if project_workspace_id:
            from sqlalchemy import select
            from app.models.project_workspace import ProjectWorkspace
            
            result = await self.db.execute(
                select(ProjectWorkspace).where(ProjectWorkspace.id == project_workspace_id)
            )
            workspace = result.scalar_one_or_none()
            if workspace:
                enterprise_info_id = workspace.enterprise_info_id
                task_type_id = workspace.task_type_id
        
        conversation = Conversation(
            title=title,
            knowledge_config_id=knowledge_config_id,
            project_workspace_id=project_workspace_id,
            enterprise_info_id=enterprise_info_id,
            task_type_id=task_type_id,
        )
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        logger.info(
            "conversation_created",
            conversation_id=str(conversation.id),
            project_workspace_id=str(project_workspace_id) if project_workspace_id else None,
            enterprise_info_id=str(enterprise_info_id) if enterprise_info_id else None,
            task_type_id=str(task_type_id) if task_type_id else None,
        )
        return conversation

    async def get_conversation(self, conversation_id: uuid.UUID) -> Conversation | None:
        """获取对话"""
        result = await self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def list_conversations(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[Conversation], int]:
        """获取对话列表"""
        query = select(Conversation)
        count_query = select(func.count(Conversation.id))

        if search:
            query = query.where(Conversation.title.ilike(f"%{search}%"))
            count_query = count_query.where(Conversation.title.ilike(f"%{search}%"))

        query = query.order_by(Conversation.updated_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        conversations = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar()

        return conversations, total

    async def update_conversation(
        self,
        conversation_id: uuid.UUID,
        title: str | None = None,
    ) -> Conversation | None:
        """更新对话"""
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            return None

        if title is not None:
            conversation.title = title

        await self.db.flush()
        await self.db.refresh(conversation)
        return conversation

    async def delete_conversation(self, conversation_id: uuid.UUID) -> bool:
        """删除对话"""
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            return False

        await self.db.delete(conversation)
        logger.info("conversation_deleted", conversation_id=str(conversation_id))
        return True

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        document_id: uuid.UUID | None = None,
        thinking_content: str | None = None,
    ) -> Message:
        """添加消息，首条用户消息自动生成对话标题"""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            document_id=document_id,
            thinking_content=thinking_content,
        )
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)

        # 更新对话的 updated_at，并检查是否需要自动生成标题
        conversation = await self.get_conversation(conversation_id)
        if conversation:
            conversation.updated_at = now_cst()

            # 首条用户消息 → 自动生成标题
            if role == 'user' and conversation.title == '新对话':
                count_result = await self.db.execute(
                    select(func.count(Message.id)).where(
                        Message.conversation_id == conversation_id,
                        Message.role == 'user',
                    )
                )
                user_msg_count = count_result.scalar()
                if user_msg_count == 1:
                    # 取消息前 30 个字符作为标题，去掉换行
                    auto_title = content[:30].replace('\n', ' ').strip()
                    if auto_title:
                        conversation.title = auto_title
                        logger.info(
                            'conversation_title_auto_generated',
                            conversation_id=str(conversation_id),
                            title=auto_title,
                        )

        return message

    async def get_messages(
        self,
        conversation_id: uuid.UUID,
    ) -> list[Message]:
        """获取对话消息"""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        return result.scalars().all()
