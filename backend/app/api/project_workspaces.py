"""项目空间 API 路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.project_workspace import (
    ProjectWorkspaceCreate,
    ProjectWorkspaceUpdate,
    ProjectWorkspaceWithRelations,
)
from app.services.project_workspace_svc import ProjectWorkspaceService

router = APIRouter()


@router.get("/project-workspaces", response_model=list[ProjectWorkspaceWithRelations], tags=["项目空间管理"])
async def list_project_workspaces(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """获取项目空间列表"""
    return await ProjectWorkspaceService.get_project_workspaces(db, skip=skip, limit=limit)


@router.post("/project-workspaces", response_model=ProjectWorkspaceWithRelations, status_code=status.HTTP_201_CREATED, tags=["项目空间管理"])
async def create_project_workspace(
    project_workspace_in: ProjectWorkspaceCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建项目空间"""
    return await ProjectWorkspaceService.create_project_workspace(db, project_workspace_in)


@router.get("/project-workspaces/{project_workspace_id}", response_model=ProjectWorkspaceWithRelations, tags=["项目空间管理"])
async def get_project_workspace(
    project_workspace_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个项目空间"""
    from uuid import UUID
    try:
        project_workspace_id_uuid = UUID(project_workspace_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的项目空间ID"
        )
    
    project_workspace = await ProjectWorkspaceService.get_project_workspace(db, project_workspace_id_uuid)
    if not project_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目空间不存在"
        )
    return project_workspace


@router.put("/project-workspaces/{project_workspace_id}", response_model=ProjectWorkspaceWithRelations, tags=["项目空间管理"])
async def update_project_workspace(
    project_workspace_id: str,
    project_workspace_in: ProjectWorkspaceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新项目空间"""
    from uuid import UUID
    try:
        project_workspace_id_uuid = UUID(project_workspace_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的项目空间ID"
        )
    
    return await ProjectWorkspaceService.update_project_workspace(db, project_workspace_id_uuid, project_workspace_in)


@router.delete("/project-workspaces/{project_workspace_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["项目空间管理"])
async def delete_project_workspace(
    project_workspace_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除项目空间"""
    from uuid import UUID
    try:
        project_workspace_id_uuid = UUID(project_workspace_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的项目空间ID"
        )
    
    await ProjectWorkspaceService.delete_project_workspace(db, project_workspace_id_uuid)
