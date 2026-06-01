# crud/installations.py

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.aviation_mngt import InstallationRecord
from schemas.schemas import InstallationCreate, RemovalUpdate


async def get_all(db: AsyncSession, active_only: bool = False) -> list[InstallationRecord]:
    stmt = select(InstallationRecord).order_by(InstallationRecord.installed_at.desc())
    if active_only:
        stmt = stmt.where(InstallationRecord.removed_at == None)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_by_id(db: AsyncSession, record_id: int) -> InstallationRecord | None:
    return await db.get(InstallationRecord, record_id)


async def get_active_by_component(
    db: AsyncSession, component_id: int
) -> InstallationRecord | None:
    """查询某部件当前有效（未关闭）的安装记录"""
    result = await db.execute(
        select(InstallationRecord).where(
            InstallationRecord.component_id == component_id,
            InstallationRecord.removed_at == None,
        )
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, body: InstallationCreate) -> InstallationRecord:
    record = InstallationRecord(**body.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def close(
    db: AsyncSession, record: InstallationRecord, body: RemovalUpdate
) -> InstallationRecord:
    """关闭（拆卸）一条安装记录"""
    record.removed_at    = body.removed_at
    record.remove_reason = body.remove_reason
    record.removed_by    = body.removed_by
    await db.flush()
    await db.refresh(record)
    return record
