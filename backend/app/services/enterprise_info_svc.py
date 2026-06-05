"""企业信息业务逻辑"""
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.enterprise_info import EnterpriseInfo
from app.schemas.enterprise_info import EnterpriseInfoCreate, EnterpriseInfoUpdate


class EnterpriseInfoService:
    """企业信息服务"""

    @staticmethod
    async def get_enterprise_infos(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> list[EnterpriseInfo]:
        """获取企业信息列表"""
        result = await db.execute(
            select(EnterpriseInfo)
            .order_by(EnterpriseInfo.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_enterprise_info(
        db: AsyncSession,
        enterprise_info_id: UUID
    ) -> EnterpriseInfo | None:
        """获取单个企业信息"""
        result = await db.execute(
            select(EnterpriseInfo).where(EnterpriseInfo.id == enterprise_info_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_enterprise_info(
        db: AsyncSession,
        enterprise_info_in: EnterpriseInfoCreate
    ) -> EnterpriseInfo:
        """创建企业信息"""
        enterprise_info = EnterpriseInfo(
            name=enterprise_info_in.name,
            description=enterprise_info_in.description
        )
        db.add(enterprise_info)
        await db.commit()
        await db.refresh(enterprise_info)
        return enterprise_info

    @staticmethod
    async def update_enterprise_info(
        db: AsyncSession,
        enterprise_info_id: UUID,
        enterprise_info_in: EnterpriseInfoUpdate
    ) -> EnterpriseInfo:
        """更新企业信息"""
        result = await db.execute(
            select(EnterpriseInfo).where(EnterpriseInfo.id == enterprise_info_id)
        )
        enterprise_info = result.scalar_one_or_none()
        
        if not enterprise_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="企业信息不存在"
            )
        
        update_data = enterprise_info_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(enterprise_info, field, value)
        
        await db.commit()
        await db.refresh(enterprise_info)
        return enterprise_info

    @staticmethod
    async def delete_enterprise_info(
        db: AsyncSession,
        enterprise_info_id: UUID
    ) -> None:
        """删除企业信息"""
        result = await db.execute(
            select(EnterpriseInfo).where(EnterpriseInfo.id == enterprise_info_id)
        )
        enterprise_info = result.scalar_one_or_none()
        
        if not enterprise_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="企业信息不存在"
            )
        
        # 检查是否有关联的项目空间
        from sqlalchemy import select as select_func
        from app.models.project_workspace import ProjectWorkspace
        from sqlalchemy import func as sql_func
        count_result = await db.execute(
            select_func(sql_func.count(ProjectWorkspace.id)).where(
                ProjectWorkspace.enterprise_info_id == enterprise_info_id
            )
        )
        count = count_result.scalar_one()
        
        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该企业信息下有关联的项目空间，无法删除"
            )
        
        await db.delete(enterprise_info)
        await db.commit()
