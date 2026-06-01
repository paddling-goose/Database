# routers/installations.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from config.db_conf import get_db
from schemas.schemas import InstallationCreate, InstallationOut, RemovalUpdate
import crud.installations as crud
import crud.components as comp_crud

router = APIRouter(prefix="/installations", tags=["安装与拆卸"])


@router.get("/", response_model=list[InstallationOut])
async def list_installations(active_only: bool = False, db: AsyncSession = Depends(get_db)):
    return await crud.get_all(db, active_only)


@router.get("/{record_id}", response_model=InstallationOut)
async def get_installation(record_id: int, db: AsyncSession = Depends(get_db)):
    obj = await crud.get_by_id(db, record_id)
    if not obj:
        raise HTTPException(404, "安装记录不存在")
    return obj


@router.post("/", response_model=InstallationOut, status_code=201, summary="部件安装")
async def install_component(body: InstallationCreate, db: AsyncSession = Depends(get_db)):
    comp = await comp_crud.get_component_by_id(db, body.component_id)
    if not comp:
        raise HTTPException(404, "部件不存在")
    if comp.status in ("retired", "scrapped"):
        raise HTTPException(400, f"部件已{comp.status}，不能安装")
    if comp.status == "installed":
        raise HTTPException(400, "部件当前已处于安装状态，请先拆卸")
    try:
        return await crud.create(db, body)
    except Exception as e:
        raise HTTPException(400, f"安装失败：{e}")


@router.patch("/{record_id}/remove", response_model=InstallationOut, summary="部件拆卸")
async def remove_component(record_id: int, body: RemovalUpdate, db: AsyncSession = Depends(get_db)):
    record = await crud.get_by_id(db, record_id)
    if not record:
        raise HTTPException(404, "安装记录不存在")
    if record.removed_at is not None:
        raise HTTPException(400, "该安装记录已关闭，不可重复拆卸")
    if body.removed_at <= record.installed_at:
        raise HTTPException(400, "拆卸时间不能早于或等于安装时间")
    try:
        return await crud.close(db, record, body)
    except Exception as e:
        raise HTTPException(400, f"拆卸失败：{e}")


@router.post("/replace", response_model=dict, summary="部件更换（事务）")
async def replace_component(
    record_id: int,
    removal: RemovalUpdate,
    new_install: InstallationCreate,
    db: AsyncSession = Depends(get_db),
):
    old_record = await crud.get_by_id(db, record_id)
    if not old_record:
        raise HTTPException(404, "旧安装记录不存在")
    if old_record.removed_at is not None:
        raise HTTPException(400, "旧安装记录已关闭")

    new_comp = await comp_crud.get_component_by_id(db, new_install.component_id)
    if not new_comp:
        raise HTTPException(404, "新部件不存在")
    if new_comp.status in ("retired", "scrapped"):
        raise HTTPException(400, "新部件已退役或报废，不可安装")
    if new_comp.status == "installed":
        raise HTTPException(400, "新部件已处于安装状态")

    try:
        await crud.close(db, old_record, removal)
        new_record = await crud.create(db, new_install)
    except Exception as e:
        raise HTTPException(400, f"部件更换失败，已回滚：{e}")

    return {"message": "部件更换成功", "new_record_id": new_record.record_id}
