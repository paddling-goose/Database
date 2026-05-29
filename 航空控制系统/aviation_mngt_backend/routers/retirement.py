# routers/retirement.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from 航空控制系统.aviation_mngt_backend.config.db_conf import get_db
from 航空控制系统.aviation_mngt_backend.schemas.schemas import RetireCreate, RetireOut
import 航空控制系统.aviation_mngt_backend.crud.retirement as crud
import 航空控制系统.aviation_mngt_backend.crud.components as comp_crud
import 航空控制系统.aviation_mngt_backend.crud.installations as install_crud

router = APIRouter(prefix="/retirement", tags=["退役"])


@router.get("/", response_model=list[RetireOut])
async def list_retirements(db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db)


@router.post("/", response_model=RetireOut, status_code=201, summary="部件退役（事务）")
async def retire_component(body: RetireCreate, db: AsyncSession = Depends(get_db)):
    comp = await comp_crud.get_component_by_id(db, body.component_id)
    if not comp:
        raise HTTPException(404, "部件不存在")
    if comp.status in ("retired", "scrapped"):
        raise HTTPException(400, "部件已处于退役或报废状态")
    if await install_crud.get_active_by_component(db, body.component_id):
        raise HTTPException(400, "部件当前仍处于安装状态，请先拆卸后再退役")
    try:
        return await crud.create(db, body)
    except Exception as e:
        raise HTTPException(400, f"退役失败：{e}")
