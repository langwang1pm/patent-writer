"""任务类型业务逻辑"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.task_type import TaskType
from app.schemas.task_type import TaskTypeCreate, TaskTypeUpdate


class TaskTypeService:
    """任务类型服务"""

    @staticmethod
    async def get_task_types(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> list[TaskType]:
        """获取任务类型列表"""
        result = await db.execute(
            select(TaskType)
            .order_by(TaskType.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_task_type(
        db: AsyncSession,
        task_type_id: UUID
    ) -> TaskType | None:
        """获取单个任务类型"""
        result = await db.execute(
            select(TaskType).where(TaskType.id == task_type_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_task_type(
        db: AsyncSession,
        task_type_in: TaskTypeCreate
    ) -> TaskType:
        """创建任务类型"""
        task_type = TaskType(
            name=task_type_in.name,
            description=task_type_in.description
        )
        db.add(task_type)
        await db.commit()
        await db.refresh(task_type)
        return task_type

    @staticmethod
    async def update_task_type(
        db: AsyncSession,
        task_type_id: UUID,
        task_type_in: TaskTypeUpdate
    ) -> TaskType:
        """更新任务类型"""
        result = await db.execute(
            select(TaskType).where(TaskType.id == task_type_id)
        )
        task_type = result.scalar_one_or_none()
        
        if not task_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="任务类型不存在"
            )
        
        update_data = task_type_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task_type, field, value)
        
        await db.commit()
        await db.refresh(task_type)
        return task_type

    @staticmethod
    async def delete_task_type(
        db: AsyncSession,
        task_type_id: UUID
    ) -> None:
        """删除任务类型"""
        result = await db.execute(
            select(TaskType).where(TaskType.id == task_type_id)
        )
        task_type = result.scalar_one_or_none()
        
        if not task_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="任务类型不存在"
            )
        
        # 检查是否有关联的项目空间
        from sqlalchemy import select as select_func
        from app.models.project_workspace import ProjectWorkspace
        count_result = await db.execute(
            select_func(func.count(ProjectWorkspace.id)).where(
                ProjectWorkspace.task_type_id == task_type_id
            )
        )
        count = count_result.scalar_one()
        
        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该任务类型下有关联的项目空间，无法删除"
            )
        
        await db.delete(task_type)
        await db.commit()
