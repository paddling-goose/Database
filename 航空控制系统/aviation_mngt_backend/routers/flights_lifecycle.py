# routers/flights_lifecycle.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from 航空控制系统.aviation_mngt_backend.config.db_conf import get_db
from 航空控制系统.aviation_mngt_backend.schemas.schemas import FlightLogCreate, FlightLogOut, LifecycleOut, ComponentOut, InstallationOut, MaintenanceOut, RetireOut
import 航空控制系统.aviation_mngt_backend.crud.flights_lifecycle as crud

router = APIRouter(tags=["飞行与追溯"])

flight_router = APIRouter(prefix="/flights")

@flight_router.get("/", response_model=list[FlightLogOut])
async def list_flights(aircraft_id: int = None, db: AsyncSession = Depends(get_db)):
    return await crud.get_all_flights(db, aircraft_id)

@flight_router.post("/", response_model=FlightLogOut, status_code=201, summary="登记飞行日志")
async def create_flight(body: FlightLogCreate, db: AsyncSession = Depends(get_db)):
    if body.arrival_time <= body.departure_time:
        raise HTTPException(400, "降落时间必须晚于起飞时间")
    if body.flight_hours <= 0:
        raise HTTPException(400, "飞行时长必须大于 0")
    try:
        return await crud.create_flight(db, body)
    except Exception as e:
        raise HTTPException(400, f"登记失败：{e}")

@flight_router.get("/{flight_id}/components", summary="查询某次飞行的在装部件")
async def flight_components(flight_id: int, db: AsyncSession = Depends(get_db)):
    flight = await crud.get_flight_by_id(db, flight_id)
    if not flight:
        raise HTTPException(404, "飞行记录不存在")
    return await crud.get_components_during_flight(db, flight)

router.include_router(flight_router)

lifecycle_router = APIRouter(prefix="/lifecycle")

@lifecycle_router.get("/{serial_no}", response_model=LifecycleOut, summary="部件生命周期追溯")
async def get_lifecycle(serial_no: str, db: AsyncSession = Depends(get_db)):
    comp = await crud.get_component_by_serial(db, serial_no)
    if not comp:
        raise HTTPException(404, "部件不存在")
    installations = await crud.get_installations_by_component(db, comp.component_id)
    maintenances  = await crud.get_maintenances_by_component(db, comp.component_id)
    retirements   = await crud.get_retirements_by_component(db, comp.component_id)
    return LifecycleOut(
        component=ComponentOut.model_validate(comp),
        installations=[InstallationOut.model_validate(r) for r in installations],
        maintenances=[MaintenanceOut.model_validate(r) for r in maintenances],
        retirements=[RetireOut.model_validate(r) for r in retirements],
    )

@lifecycle_router.get("/stats/component-flight-hours", summary="部件飞行统计")
async def component_flight_stats(db: AsyncSession = Depends(get_db)):
    return await crud.stat_component_flight_hours(db)

@lifecycle_router.get("/stats/maintenance-summary", summary="各型号维修统计")
async def maintenance_summary(db: AsyncSession = Depends(get_db)):
    return await crud.stat_maintenance_summary(db)

router.include_router(lifecycle_router)
