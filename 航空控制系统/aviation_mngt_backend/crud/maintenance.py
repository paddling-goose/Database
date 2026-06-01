# crud/maintenance.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.aviation_mngt import MaintenanceRecord,Component
from schemas.schemas import MaintenanceCreate, MaintenanceClose



async def get_all(
    db: AsyncSession, component_id: int | None = None
) -> list[MaintenanceRecord]:
    stmt = select(MaintenanceRecord).order_by(MaintenanceRecord.start_time.desc())
    if component_id:
        stmt = stmt.where(MaintenanceRecord.component_id == component_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_by_id(db: AsyncSession, maint_id: int) -> MaintenanceRecord | None:
    return await db.get(MaintenanceRecord, maint_id)


async def create(db: AsyncSession, body: MaintenanceCreate) -> MaintenanceRecord:
    record = MaintenanceRecord(**body.model_dump())
    db.add(record)
    await db.flush()

    comp = await db.get(Component, body.component_id)
    if comp and comp.status not in ("retired", "scrapped"):
        comp.status = "under_maintenance"

    await db.refresh(record)
    return record


async def close(
    db: AsyncSession, record: MaintenanceRecord, body: MaintenanceClose
) -> MaintenanceRecord:
    record.end_time    = body.end_time
    record.result      = body.result
    record.approver_id = body.approver_id
    if body.description:
        record.description = body.description
    await db.flush()
    await db.refresh(record)
    return record
