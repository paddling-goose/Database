# crud/components.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.aviation_mngt import Component, ComponentModel
from schemas.schemas import ComponentCreate, ComponentModelCreate


# ===== 部件型号 =====

async def get_all_models(db: AsyncSession) -> list[ComponentModel]:
    result = await db.execute(select(ComponentModel))
    return result.scalars().all()


async def get_model_by_id(db: AsyncSession, model_id: int) -> ComponentModel | None:
    return await db.get(ComponentModel, model_id)


async def get_model_by_code(db: AsyncSession, model_code: str) -> ComponentModel | None:
    result = await db.execute(
        select(ComponentModel).where(ComponentModel.model_code == model_code)
    )
    return result.scalar_one_or_none()


async def create_model(db: AsyncSession, body: ComponentModelCreate) -> ComponentModel:
    obj = ComponentModel(**body.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


# ===== 部件实例 =====

async def get_all_components(
    db: AsyncSession, status: str | None = None
) -> list[Component]:
    stmt = select(Component)
    if status:
        stmt = stmt.where(Component.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_component_by_id(db: AsyncSession, component_id: int) -> Component | None:
    return await db.get(Component, component_id)


async def get_component_by_serial(db: AsyncSession, serial_no: str) -> Component | None:
    result = await db.execute(
        select(Component).where(Component.serial_no == serial_no)
    )
    return result.scalar_one_or_none()


async def create_component(db: AsyncSession, body: ComponentCreate) -> Component:
    obj = Component(**body.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj
