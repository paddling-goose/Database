# routers/aircraft.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from 航空控制系统.aviation_mngt_backend.config.db_conf import get_db
from 航空控制系统.aviation_mngt_backend.schemas.schemas import AircraftCreate, AircraftOut
import 航空控制系统.aviation_mngt_backend.crud.aircraft as crud

router = APIRouter(prefix="/aircraft", tags=["飞机"])


@router.get("/", response_model=list[AircraftOut])
async def list_aircraft(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.get("/{aircraft_id}", response_model=AircraftOut)
async def get_aircraft(aircraft_id: int, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_by_id(db, aircraft_id)
    if not obj:
        raise HTTPException(404, "飞机不存在")
    return obj


@router.post("/", response_model=AircraftOut, status_code=201)
async def create_aircraft(body: AircraftCreate, db: AsyncSession = Depends(get_db)):
    if await crud.get_by_registration(db, body.registration_no):
        raise HTTPException(400, "注册号已存在")
    return await crud.create(db, body)


@router.patch("/{aircraft_id}/status")
async def update_aircraft_status(
    aircraft_id: int, status: str, db: AsyncSession = Depends(get_db)
):
    allowed = {"active", "maintenance", "decommissioned"}
    if status not in allowed:
        raise HTTPException(400, f"状态须为 {allowed} 之一")
    obj = await crud.get_by_id(db, aircraft_id)
    if not obj:
        raise HTTPException(404, "飞机不存在")
    await crud.update_status(db, obj, status)
    return {"message": "状态已更新", "status": status}
