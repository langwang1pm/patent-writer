"""项目空间业务逻辑"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.project_workspace import ProjectWorkspace
from app.models.enterprise_info import EnterpriseInfo
from app.models.task_type import TaskType
from app.schemas.project_workspace import ProjectWorkspaceCreate, ProjectWorkspaceUpdate


class ProjectWorkspaceService:
    """项目空间服务"""

    @staticmethod
    async def get_project_workspaces(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> list[ProjectWorkspace]:
        """获取项目空间列表"""
        result = await db.execute(
            select(ProjectWorkspace)
            .order_by(ProjectWorkspace.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        projects = list(result.scalars().all())
        
        # 加载关联关系
        for project in projects:
            await db.refresh(project, ["enterprise_info", "task_type"])
        
        return projects

    @staticmethod
    async def get_project_workspace(
        db: AsyncSession,
        project_workspace_id: UUID
    ) -> ProjectWorkspace | None:
        """获取单个项目空间"""
        result = await db.execute(
            select(ProjectWorkspace).where(ProjectWorkspace.id == project_workspace_id)
        )
        project = result.scalar_one_or_none()
        
        if project:
            await db.refresh(project, ["enterprise_info", "task_type"])
        
        return project

    @staticmethod
    async def create_project_workspace(
        db: AsyncSession,
        project_workspace_in: ProjectWorkspaceCreate
    ) -> ProjectWorkspace:
        """创建项目空间"""
        # 验证 enterprise_info_id 是否存在
        enterprise_result = await db.execute(
            select(EnterpriseInfo).where(EnterpriseInfo.id == project_workspace_in.enterprise_info_id)
        )
        if not enterprise_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="客户企业不存在"
            )
        
        # 验证 task_type_id 是否存在
        task_type_result = await db.execute(
            select(TaskType).where(TaskType.id == project_workspace_in.task_type_id)
        )
        if not task_type_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="任务类型不存在"
            )
        
        project_workspace = ProjectWorkspace(
            workspace_name=project_workspace_in.workspace_name,
            enterprise_info_id=project_workspace_in.enterprise_info_id,
            task_type_id=project_workspace_in.task_type_id
        )
        db.add(project_workspace)
        await db.commit()
        await db.refresh(project_workspace)
        
        # 加载关联关系
        await db.refresh(project_workspace, ["enterprise_info", "task_type"])
        
        return project_workspace

    @staticmethod
    async def update_project_workspace(
        db: AsyncSession,
        project_workspace_id: UUID,
        project_workspace_in: ProjectWorkspaceUpdate
    ) -> ProjectWorkspace:
        """更新项目空间"""
        result = await db.execute(
            select(ProjectWorkspace).where(ProjectWorkspace.id == project_workspace_id)
        )
        project_workspace = result.scalar_one_or_none()
        
        if not project_workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目空间不存在"
            )
        
        update_data = project_workspace_in.model_dump(exclude_unset=True)
        
        # 验证 enterprise_info_id 是否存在（如果更新）
        if "enterprise_info_id" in update_data:
            enterprise_result = await db.execute(
                select(EnterpriseInfo).where(EnterpriseInfo.id == update_data["enterprise_info_id"])
            )
            if not enterprise_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="客户企业不存在"
                )
        
        # 验证 task_type_id 是否存在（如果更新）
        if "task_type_id" in update_data:
            task_type_result = await db.execute(
                select(TaskType).where(TaskType.id == update_data["task_type_id"])
            )
            if not task_type_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="任务类型不存在"
                )
        
        for field, value in update_data.items():
            setattr(project_workspace, field, value)
        
        await db.commit()
        await db.refresh(project_workspace)
        
        # 加载关联关系
        await db.refresh(project_workspace, ["enterprise_info", "task_type"])
        
        return project_workspace

    @staticmethod
    async def delete_project_workspace(
        db: AsyncSession,
        project_workspace_id: UUID
    ) -> None:
        """删除项目空间"""
        result = await db.execute(
            select(ProjectWorkspace).where(ProjectWorkspace.id == project_workspace_id)
        )
        project_workspace = result.scalar_one_or_none()
        
        if not project_workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目空间不存在"
            )
        
        await db.delete(project_workspace)
        await db.commit()
