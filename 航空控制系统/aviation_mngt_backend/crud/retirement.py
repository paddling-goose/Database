# crud/retirement.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from 航空控制系统.aviation_mngt_backend.models.aviation_mngt import ScrapOrRetirementRecord
from 航空控制系统.aviation_mngt_backend.schemas.schemas import RetireCreate


async def get_all(db: AsyncSession) -> list[ScrapOrRetirementRecord]:
    result = await db.execute(select(ScrapOrRetirementRecord))
    return result.scalars().all()


async def create(db: AsyncSession, body: RetireCreate) -> ScrapOrRetirementRecord:
    record = ScrapOrRetirementRecord(**body.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record
