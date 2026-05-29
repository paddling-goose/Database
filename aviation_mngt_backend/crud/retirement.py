# crud/retirement.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.aviation_mngt import ScrapOrRetirementRecord
from schemas.schemas import RetireCreate


async def get_all(db: AsyncSession) -> list[ScrapOrRetirementRecord]:
    result = await db.execute(select(ScrapOrRetirementRecord))
    return result.scalars().all()


async def create(db: AsyncSession, body: RetireCreate) -> ScrapOrRetirementRecord:
    record = ScrapOrRetirementRecord(**body.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record
