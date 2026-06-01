# routers/components.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from config.db_conf import get_db
from schemas.schemas import ComponentCreate, ComponentOut, ComponentModelCreate, ComponentModelOut
import crud.components as crud

router = APIRouter(tags=["部件"])

model_router = APIRouter(prefix="/component-models")

@model_router.get("/", response_model=list[ComponentModelOut])
async def list_models(db: AsyncSession = Depends(get_db)):
    return await crud.get_all_models(db)

@model_router.get("/{model_id}", response_model=ComponentModelOut)
async def get_model(model_id: int, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_model_by_id(db, model_id)
    if not obj:
        raise HTTPException(404, "型号不存在")
    return obj

@model_router.post("/", response_model=ComponentModelOut, status_code=201)
async def create_model(body: ComponentModelCreate, db: AsyncSession = Depends(get_db)):
    if await crud.get_model_by_code(db, body.model_code):
        raise HTTPException(400, "型号编码已存在")
    return await crud.create_model(db, body)

router.include_router(model_router)

comp_router = APIRouter(prefix="/components")

@comp_router.get("/", response_model=list[ComponentOut])
async def list_components(status: str = None, db: AsyncSession = Depends(get_db)):
    return await crud.get_all_components(db, status)

@comp_router.get("/{component_id}", response_model=ComponentOut)
async def get_component(component_id: int, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_component_by_id(db, component_id)
    if not obj:
        raise HTTPException(404, "部件不存在")
    return obj

@comp_router.post("/", response_model=ComponentOut, status_code=201, summary="部件入库")
async def create_component(body: ComponentCreate, db: AsyncSession = Depends(get_db)):
    if await crud.get_component_by_serial(db, body.serial_no):
        raise HTTPException(400, "序列号已存在，禁止重复入库")
    if not await crud.get_model_by_id(db, body.model_id):
        raise HTTPException(404, "部件型号不存在")
    return await crud.create_component(db, body)

router.include_router(comp_router)
