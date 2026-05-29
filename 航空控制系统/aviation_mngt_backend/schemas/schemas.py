# schemas/schemas.py

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


# ============================================================
# Operator
# ============================================================
class OperatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    operator_id: int
    name:        str
    role:        str
    employee_no: str
    phone:       Optional[str]
    is_active:   int


# ============================================================
# Aircraft
# ============================================================
class AircraftCreate(BaseModel):
    registration_no:   str
    model:             str
    status:            str = "active"
    commissioned_date: date
    notes:             Optional[str] = None

class AircraftOut(AircraftCreate):
    model_config = ConfigDict(from_attributes=True)

    aircraft_id: int
    created_at:  datetime


# ============================================================
# ComponentModel 部件型号
# ============================================================
class ComponentModelCreate(BaseModel):
    model_code:                 str
    category:                   str
    design_life_hours:          Optional[Decimal] = None
    maintenance_interval_hours: Optional[Decimal] = None
    applicable_aircraft:        Optional[str]     = None
    manufacturer:               Optional[str]     = None
    description:                Optional[str]     = None

class ComponentModelOut(ComponentModelCreate):
    model_config = ConfigDict(from_attributes=True)

    model_id:   int
    created_at: datetime


# ============================================================
# Component 部件实例
# ============================================================
class ComponentCreate(BaseModel):
    serial_no:        str
    model_id:         int
    batch_no:         Optional[str]  = None
    manufacture_date: Optional[date] = None
    inbound_date:     date
    notes:            Optional[str]  = None

class ComponentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    component_id:      int
    serial_no:         str
    model_id:          int
    batch_no:          Optional[str]
    manufacture_date:  Optional[date]
    inbound_date:      date
    status:            str
    accumulated_hours: Decimal
    notes:             Optional[str]
    created_at:        datetime
    updated_at:        datetime


# ============================================================
# InstallationRecord 安装记录
# ============================================================
class InstallationCreate(BaseModel):
    component_id:   int
    aircraft_id:    int
    install_pos:    Optional[str]      = None
    installed_at:   datetime
    install_reason: Optional[str]      = None
    installed_by:   Optional[int]      = None

class RemovalUpdate(BaseModel):
    removed_at:    datetime
    remove_reason: Optional[str] = None
    removed_by:    Optional[int] = None

class InstallationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_id:      int
    component_id:   int
    aircraft_id:    int
    install_pos:    Optional[str]
    installed_at:   datetime
    removed_at:     Optional[datetime]
    install_reason: Optional[str]
    remove_reason:  Optional[str]
    installed_by:   Optional[int]
    removed_by:     Optional[int]
    created_at:     datetime


# ============================================================
# MaintenanceRecord 维修记录
# ============================================================
class MaintenanceCreate(BaseModel):
    component_id:  int
    maint_type:    str
    start_time:    datetime
    description:   Optional[str] = None
    technician_id: Optional[int] = None
    approver_id:   Optional[int] = None

class MaintenanceClose(BaseModel):
    end_time:    datetime
    result:      str
    description: Optional[str] = None
    approver_id: Optional[int] = None

class MaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    maint_id:      int
    component_id:  int
    maint_type:    str
    start_time:    datetime
    end_time:      Optional[datetime]
    result:        Optional[str]
    description:   Optional[str]
    technician_id: Optional[int]
    approver_id:   Optional[int]
    created_at:    datetime


# ============================================================
# FlightLog 飞行日志
# ============================================================
class FlightLogCreate(BaseModel):
    aircraft_id:    int
    flight_no:      Optional[str]     = None
    mission_type:   str               = "other"
    departure_time: datetime
    arrival_time:   datetime
    flight_hours:   Decimal
    departure_loc:  Optional[str]     = None
    arrival_loc:    Optional[str]     = None
    pilot_id:       Optional[int]     = None
    notes:          Optional[str]     = None

class FlightLogOut(FlightLogCreate):
    model_config = ConfigDict(from_attributes=True)

    flight_id:  int
    created_at: datetime


# ============================================================
# ScrapOrRetirementRecord 退役记录
# ============================================================
class RetireCreate(BaseModel):
    component_id: int
    retire_type:  str
    retire_time:  datetime
    reason:       str
    approver_id:  Optional[int] = None

class RetireOut(RetireCreate):
    model_config = ConfigDict(from_attributes=True)

    scrap_id:   int
    created_at: datetime


# ============================================================
# 生命周期追溯（组合响应）
# ============================================================
class LifecycleOut(BaseModel):
    component:     ComponentOut
    installations: list[InstallationOut]
    maintenances:  list[MaintenanceOut]
    retirements:   list[RetireOut]
