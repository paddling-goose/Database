# routers/maintenance.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from 航空控制系统.aviation_mngt_backend.config.db_conf import get_db
from 航空控制系统.aviation_mngt_backend.schemas.schemas import MaintenanceCreate, MaintenanceClose, MaintenanceOut
import 航空控制系统.aviation_mngt_backend.crud.maintenance as crud
import 航空控制系统.aviation_mngt_backend.crud.components as comp_crud

router = APIRouter(prefix="/maintenance", tags=["维修"])


@router.get("/", response_model=list[MaintenanceOut])
async def list_maintenance(component_id: int = None, db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db, component_id)


@router.get("/{maint_id}", response_model=MaintenanceOut)
async def get_maintenance(maint_id: int, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_by_id(db, maint_id)
    if not obj:
        raise HTTPException(404, "维修记录不存在")
    return obj


@router.post("/", response_model=MaintenanceOut, status_code=201, summary="登记维修工单")
async def create_maintenance(body: MaintenanceCreate, db: AsyncSession = Depends(get_db)):
    comp = await comp_crud.get_component_by_id(db, body.component_id)
    if not comp:
        raise HTTPException(404, "部件不存在")
    if comp.status in ("retired", "scrapped"):
        raise HTTPException(400, "退役或报废部件不能创建维修记录")
    try:
        return await crud.create(db, body)
    except Exception as e:
        raise HTTPException(400, f"登记失败：{e}")


@router.patch("/{maint_id}/close", response_model=MaintenanceOut, summary="完成维修（事务）")
async def close_maintenance(maint_id: int, body: MaintenanceClose, db: AsyncSession = Depends(get_db)):
    record = await crud.get_by_id(db, maint_id)
    if not record:
        raise HTTPException(404, "维修记录不存在")
    if record.end_time is not None:
        raise HTTPException(400, "该维修工单已关闭")
    if body.end_time < record.start_time:
        raise HTTPException(400, "完成时间不能早于送修时间")
    try:
        return await crud.close(db, record, body)
    except Exception as e:
        raise HTTPException(400, f"维修关闭失败：{e}")
