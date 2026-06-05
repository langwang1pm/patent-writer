"""任务类型 API 路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.task_type import (
    TaskTypeCreate,
    TaskTypeUpdate,
    TaskTypeResponse,
)
from app.services.task_type_svc import TaskTypeService

router = APIRouter()


@router.get("", response_model=list[TaskTypeResponse], tags=["任务类型管理"])
async def list_task_types(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """获取任务类型列表"""
    return await TaskTypeService.get_task_types(db, skip=skip, limit=limit)


@router.post("", response_model=TaskTypeResponse, status_code=status.HTTP_201_CREATED, tags=["任务类型管理"])
async def create_task_type(
    task_type_in: TaskTypeCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建任务类型"""
    return await TaskTypeService.create_task_type(db, task_type_in)


@router.get("/{task_type_id}", response_model=TaskTypeResponse, tags=["任务类型管理"])
async def get_task_type(
    task_type_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个任务类型"""
    from uuid import UUID
    try:
        task_type_id_uuid = UUID(task_type_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的任务类型ID"
        )
    
    task_type = await TaskTypeService.get_task_type(db, task_type_id_uuid)
    if not task_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务类型不存在"
        )
    return task_type


@router.put("/{task_type_id}", response_model=TaskTypeResponse, tags=["任务类型管理"])
async def update_task_type(
    task_type_id: str,
    task_type_in: TaskTypeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新任务类型"""
    from uuid import UUID
    try:
        task_type_id_uuid = UUID(task_type_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的任务类型ID"
        )
    
    return await TaskTypeService.update_task_type(db, task_type_id_uuid, task_type_in)


@router.delete("/{task_type_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["任务类型管理"])
async def delete_task_type(
    task_type_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除任务类型"""
    from uuid import UUID
    try:
        task_type_id_uuid = UUID(task_type_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的任务类型ID"
        )
    
    await TaskTypeService.delete_task_type(db, task_type_id_uuid)
