"""企业信息 API 路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.enterprise_info import (
    EnterpriseInfoCreate,
    EnterpriseInfoUpdate,
    EnterpriseInfoResponse,
)
from app.services.enterprise_info_svc import EnterpriseInfoService

router = APIRouter()


@router.get("", response_model=list[EnterpriseInfoResponse], tags=["企业信息管理"])
async def list_enterprise_infos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """获取企业信息列表"""
    return await EnterpriseInfoService.get_enterprise_infos(db, skip=skip, limit=limit)


@router.post("", response_model=EnterpriseInfoResponse, status_code=status.HTTP_201_CREATED, tags=["企业信息管理"])
async def create_enterprise_info(
    enterprise_info_in: EnterpriseInfoCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建企业信息"""
    return await EnterpriseInfoService.create_enterprise_info(db, enterprise_info_in)


@router.get("/{enterprise_info_id}", response_model=EnterpriseInfoResponse, tags=["企业信息管理"])
async def get_enterprise_info(
    enterprise_info_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个企业信息"""
    from uuid import UUID
    try:
        enterprise_info_id_uuid = UUID(enterprise_info_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的企业信息ID"
        )
    
    enterprise_info = await EnterpriseInfoService.get_enterprise_info(db, enterprise_info_id_uuid)
    if not enterprise_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="企业信息不存在"
        )
    return enterprise_info


@router.put("/{enterprise_info_id}", response_model=EnterpriseInfoResponse, tags=["企业信息管理"])
async def update_enterprise_info(
    enterprise_info_id: str,
    enterprise_info_in: EnterpriseInfoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新企业信息"""
    from uuid import UUID
    try:
        enterprise_info_id_uuid = UUID(enterprise_info_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的企业信息ID"
        )
    
    return await EnterpriseInfoService.update_enterprise_info(db, enterprise_info_id_uuid, enterprise_info_in)


@router.delete("/{enterprise_info_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["企业信息管理"])
async def delete_enterprise_info(
    enterprise_info_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除企业信息"""
    from uuid import UUID
    try:
        enterprise_info_id_uuid = UUID(enterprise_info_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的企业信息ID"
        )
    
    await EnterpriseInfoService.delete_enterprise_info(db, enterprise_info_id_uuid)
