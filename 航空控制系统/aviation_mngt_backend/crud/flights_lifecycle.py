# crud/flights_lifecycle.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from models.aviation_mngt import (
    FlightLog, Component, InstallationRecord,
    MaintenanceRecord, ScrapOrRetirementRecord,
)
from schemas.schemas import FlightLogCreate


# ===== 飞行日志 =====

async def get_all_flights(
    db: AsyncSession, aircraft_id: int | None = None
) -> list[FlightLog]:
    stmt = select(FlightLog).order_by(FlightLog.departure_time.desc())
    if aircraft_id:
        stmt = stmt.where(FlightLog.aircraft_id == aircraft_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_flight_by_id(db: AsyncSession, flight_id: int) -> FlightLog | None:
    return await db.get(FlightLog, flight_id)


async def create_flight(db: AsyncSession, body: FlightLogCreate) -> FlightLog:
    record = FlightLog(**body.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def get_components_during_flight(
    db: AsyncSession, flight: FlightLog
) -> list[dict]:
    """查询某次飞行时飞机上的在装部件（关联分析）"""
    result = await db.execute(text("""
        SELECT c.serial_no, cm.model_code, cm.category,
               ir.install_pos, ir.installed_at, ir.removed_at
        FROM InstallationRecord ir
        JOIN Component      c  ON ir.component_id = c.component_id
        JOIN ComponentModel cm ON c.model_id      = cm.model_id
        WHERE ir.aircraft_id   = :aid
          AND ir.installed_at <= :dep
          AND (ir.removed_at IS NULL OR ir.removed_at >= :arr)
    """), {
        "aid": flight.aircraft_id,
        "dep": flight.departure_time,
        "arr": flight.arrival_time,
    })
    return [dict(r._mapping) for r in result]


# ===== 生命周期追溯 =====

async def get_component_by_serial(db: AsyncSession, serial_no: str) -> Component | None:
    result = await db.execute(
        select(Component).where(Component.serial_no == serial_no)
    )
    return result.scalar_one_or_none()


async def get_installations_by_component(
    db: AsyncSession, component_id: int
) -> list[InstallationRecord]:
    result = await db.execute(
        select(InstallationRecord)
        .where(InstallationRecord.component_id == component_id)
        .order_by(InstallationRecord.installed_at)
    )
    return result.scalars().all()


async def get_maintenances_by_component(
    db: AsyncSession, component_id: int
) -> list[MaintenanceRecord]:
    result = await db.execute(
        select(MaintenanceRecord)
        .where(MaintenanceRecord.component_id == component_id)
        .order_by(MaintenanceRecord.start_time)
    )
    return result.scalars().all()


async def get_retirements_by_component(
    db: AsyncSession, component_id: int
) -> list[ScrapOrRetirementRecord]:
    result = await db.execute(
        select(ScrapOrRetirementRecord)
        .where(ScrapOrRetirementRecord.component_id == component_id)
    )
    return result.scalars().all()


# ===== 统计查询 =====

async def stat_component_flight_hours(db: AsyncSession) -> list[dict]:
    """各部件经历的飞行次数与累计小时"""
    result = await db.execute(text("""
        SELECT c.serial_no, cm.model_code, cm.category,
               a.registration_no                 AS aircraft_reg,
               ir.install_pos,
               COUNT(fl.flight_id)               AS flight_count,
               COALESCE(SUM(fl.flight_hours), 0) AS total_hours
        FROM InstallationRecord ir
        JOIN Component      c  ON ir.component_id = c.component_id
        JOIN ComponentModel cm ON c.model_id      = cm.model_id
        JOIN Aircraft       a  ON ir.aircraft_id  = a.aircraft_id
        LEFT JOIN FlightLog fl
               ON fl.aircraft_id    = ir.aircraft_id
              AND fl.departure_time >= ir.installed_at
              AND (ir.removed_at IS NULL OR fl.arrival_time <= ir.removed_at)
        GROUP BY c.serial_no, cm.model_code, cm.category,
                 a.registration_no, ir.install_pos
        ORDER BY total_hours DESC
    """))
    return [dict(r._mapping) for r in result]


async def stat_maintenance_summary(db: AsyncSession) -> list[dict]:
    """各型号部件维修次数、平均耗时、不合格次数"""
    result = await db.execute(text("""
        SELECT cm.model_code, cm.category,
               COUNT(mr.maint_id)  AS total_maint,
               AVG(TIMESTAMPDIFF(HOUR, mr.start_time, mr.end_time)) AS avg_hours,
               SUM(mr.result = 'failed') AS failed_count
        FROM MaintenanceRecord mr
        JOIN Component      c  ON mr.component_id = c.component_id
        JOIN ComponentModel cm ON c.model_id      = cm.model_id
        WHERE mr.end_time IS NOT NULL
        GROUP BY cm.model_id, cm.model_code, cm.category
    """))
    return [dict(r._mapping) for r in result]
