# crud/aircraft.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from 航空控制系统.aviation_mngt_backend.models.aviation_mngt import Aircraft
from 航空控制系统.aviation_mngt_backend.schemas.schemas import AircraftCreate


async def get_all(db: AsyncSession) -> list[Aircraft]:
    result = await db.execute(select(Aircraft))
    return result.scalars().all()


async def get_by_id(db: AsyncSession, aircraft_id: int) -> Aircraft | None:
    return await db.get(Aircraft, aircraft_id)


async def get_by_registration(db: AsyncSession, registration_no: str) -> Aircraft | None:
    result = await db.execute(
        select(Aircraft).where(Aircraft.registration_no == registration_no)
    )
    return result.scalar_one_or_none()


async def create(db: AsyncSession, body: AircraftCreate) -> Aircraft:
    obj = Aircraft(**body.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


async def update_status(db: AsyncSession, obj: Aircraft, status: str) -> Aircraft:
    obj.status = status
    await db.flush()
    return obj
