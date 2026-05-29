# models/aviation_mngt.py

from sqlalchemy import (
    BigInteger, String, Text, Date, DateTime, Enum,
    Numeric, SmallInteger, ForeignKey, func
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class Base(DeclarativeBase):
    pass


# ============================================================
# Operator 操作/技术人员表
# ============================================================
class Operator(Base):
    __tablename__ = "Operator"

    operator_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name:        Mapped[str] = mapped_column(String(50), nullable=False)
    role:        Mapped[str] = mapped_column(
        Enum("installer", "technician", "supervisor", "admin"), nullable=False
    )
    employee_no: Mapped[str]          = mapped_column(String(30), nullable=False, unique=True)
    phone:       Mapped[Optional[str]] = mapped_column(String(20))
    is_active:   Mapped[int]           = mapped_column(SmallInteger, nullable=False, default=1)
    created_at:  Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())


# ============================================================
# Aircraft 飞机表
# ============================================================
class Aircraft(Base):
    __tablename__ = "Aircraft"

    aircraft_id:       Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    registration_no:   Mapped[str]           = mapped_column(String(20), nullable=False, unique=True)
    model:             Mapped[str]           = mapped_column(String(50), nullable=False)
    status:            Mapped[str]           = mapped_column(
        Enum("active", "maintenance", "decommissioned"), nullable=False, default="active"
    )
    commissioned_date: Mapped[date]          = mapped_column(Date, nullable=False)
    notes:             Mapped[Optional[str]] = mapped_column(Text)
    created_at:        Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())

    installations: Mapped[list["InstallationRecord"]] = relationship(back_populates="aircraft")
    flights:       Mapped[list["FlightLog"]]          = relationship(back_populates="aircraft")


# ============================================================
# ComponentModel 部件型号表
# ============================================================
class ComponentModel(Base):
    __tablename__ = "ComponentModel"

    model_id:                   Mapped[int]              = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    model_code:                 Mapped[str]              = mapped_column(String(30), nullable=False, unique=True)
    category:                   Mapped[str]              = mapped_column(String(50), nullable=False)
    design_life_hours:          Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    maintenance_interval_hours: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    applicable_aircraft:        Mapped[Optional[str]]    = mapped_column(String(200))
    manufacturer:               Mapped[Optional[str]]    = mapped_column(String(100))
    description:                Mapped[Optional[str]]    = mapped_column(Text)
    created_at:                 Mapped[datetime]         = mapped_column(DateTime, server_default=func.now())

    components: Mapped[list["Component"]] = relationship(back_populates="model")


# ============================================================
# Component 部件实例表
# ============================================================
class Component(Base):
    __tablename__ = "Component"

    component_id:      Mapped[int]              = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    serial_no:         Mapped[str]              = mapped_column(String(50), nullable=False, unique=True)
    model_id:          Mapped[int]              = mapped_column(ForeignKey("ComponentModel.model_id", onupdate="CASCADE"), nullable=False)
    batch_no:          Mapped[Optional[str]]    = mapped_column(String(30))
    manufacture_date:  Mapped[Optional[date]]   = mapped_column(Date)
    inbound_date:      Mapped[date]             = mapped_column(Date, nullable=False)
    status:            Mapped[str]              = mapped_column(
        Enum("available", "installed", "under_maintenance", "retired", "scrapped"),
        nullable=False, default="available"
    )
    accumulated_hours: Mapped[Decimal]          = mapped_column(Numeric(10, 2), nullable=False, default=0.00)
    is_active:         Mapped[int]              = mapped_column(SmallInteger, nullable=False, default=1)
    notes:             Mapped[Optional[str]]    = mapped_column(Text)
    created_at:        Mapped[datetime]         = mapped_column(DateTime, server_default=func.now())
    updated_at:        Mapped[datetime]         = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    model:        Mapped["ComponentModel"]              = relationship(back_populates="components")
    installations: Mapped[list["InstallationRecord"]]  = relationship(back_populates="component")
    maintenances:  Mapped[list["MaintenanceRecord"]]   = relationship(back_populates="component")
    retirements:   Mapped[list["ScrapOrRetirementRecord"]] = relationship(back_populates="component")


# ============================================================
# InstallationRecord 安装记录表（历史保留，禁止覆盖）
# ============================================================
class InstallationRecord(Base):
    __tablename__ = "InstallationRecord"

    record_id:      Mapped[int]              = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    component_id:   Mapped[int]              = mapped_column(ForeignKey("Component.component_id", onupdate="CASCADE"), nullable=False)
    aircraft_id:    Mapped[int]              = mapped_column(ForeignKey("Aircraft.aircraft_id", onupdate="CASCADE"), nullable=False)
    install_pos:    Mapped[Optional[str]]    = mapped_column(String(50))
    installed_at:   Mapped[datetime]         = mapped_column(DateTime, nullable=False)
    removed_at:     Mapped[Optional[datetime]] = mapped_column(DateTime)
    install_reason: Mapped[Optional[str]]    = mapped_column(String(200))
    remove_reason:  Mapped[Optional[str]]    = mapped_column(String(200))
    installed_by:   Mapped[Optional[int]]    = mapped_column(ForeignKey("Operator.operator_id", onupdate="CASCADE"))
    removed_by:     Mapped[Optional[int]]    = mapped_column(ForeignKey("Operator.operator_id", onupdate="CASCADE"))
    created_at:     Mapped[datetime]         = mapped_column(DateTime, server_default=func.now())
    updated_at:     Mapped[datetime]         = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    component: Mapped["Component"] = relationship(back_populates="installations")
    aircraft:  Mapped["Aircraft"]  = relationship(back_populates="installations")
    installer: Mapped[Optional["Operator"]] = relationship(foreign_keys=[installed_by])
    remover:   Mapped[Optional["Operator"]] = relationship(foreign_keys=[removed_by])


# ============================================================
# MaintenanceRecord 维修记录表
# ============================================================
class MaintenanceRecord(Base):
    __tablename__ = "MaintenanceRecord"

    maint_id:      Mapped[int]              = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    component_id:  Mapped[int]              = mapped_column(ForeignKey("Component.component_id", onupdate="CASCADE"), nullable=False)
    maint_type:    Mapped[str]              = mapped_column(
        Enum("routine", "repair", "overhaul", "inspection"), nullable=False
    )
    start_time:    Mapped[datetime]         = mapped_column(DateTime, nullable=False)
    end_time:      Mapped[Optional[datetime]] = mapped_column(DateTime)
    result:        Mapped[Optional[str]]    = mapped_column(Enum("pass", "conditional", "failed"))
    description:   Mapped[Optional[str]]    = mapped_column(Text)
    technician_id: Mapped[Optional[int]]    = mapped_column(ForeignKey("Operator.operator_id", onupdate="CASCADE"))
    approver_id:   Mapped[Optional[int]]    = mapped_column(ForeignKey("Operator.operator_id", onupdate="CASCADE"))
    created_at:    Mapped[datetime]         = mapped_column(DateTime, server_default=func.now())
    updated_at:    Mapped[datetime]         = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    component:  Mapped["Component"]         = relationship(back_populates="maintenances")
    technician: Mapped[Optional["Operator"]] = relationship(foreign_keys=[technician_id])
    approver:   Mapped[Optional["Operator"]] = relationship(foreign_keys=[approver_id])


# ============================================================
# FlightLog 飞行记录表
# ============================================================
class FlightLog(Base):
    __tablename__ = "FlightLog"

    flight_id:      Mapped[int]              = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    aircraft_id:    Mapped[int]              = mapped_column(ForeignKey("Aircraft.aircraft_id", onupdate="CASCADE"), nullable=False)
    flight_no:      Mapped[Optional[str]]    = mapped_column(String(30))
    mission_type:   Mapped[str]              = mapped_column(
        Enum("training", "mission", "test", "commercial", "other"), nullable=False, default="other"
    )
    departure_time: Mapped[datetime]         = mapped_column(DateTime, nullable=False)
    arrival_time:   Mapped[datetime]         = mapped_column(DateTime, nullable=False)
    flight_hours:   Mapped[Decimal]          = mapped_column(Numeric(6, 2), nullable=False)
    departure_loc:  Mapped[Optional[str]]    = mapped_column(String(50))
    arrival_loc:    Mapped[Optional[str]]    = mapped_column(String(50))
    pilot_id:       Mapped[Optional[int]]    = mapped_column(ForeignKey("Operator.operator_id", onupdate="CASCADE"))
    notes:          Mapped[Optional[str]]    = mapped_column(Text)
    created_at:     Mapped[datetime]         = mapped_column(DateTime, server_default=func.now())

    aircraft: Mapped["Aircraft"]         = relationship(back_populates="flights")
    pilot:    Mapped[Optional["Operator"]] = relationship(foreign_keys=[pilot_id])


# ============================================================
# ScrapOrRetirementRecord 退役/报废记录表
# ============================================================
class ScrapOrRetirementRecord(Base):
    __tablename__ = "ScrapOrRetirementRecord"

    scrap_id:     Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    component_id: Mapped[int]           = mapped_column(ForeignKey("Component.component_id", onupdate="CASCADE"), nullable=False)
    retire_type:  Mapped[str]           = mapped_column(Enum("retired", "scrapped", "admin"), nullable=False)
    retire_time:  Mapped[datetime]      = mapped_column(DateTime, nullable=False)
    reason:       Mapped[str]           = mapped_column(Text, nullable=False)
    approver_id:  Mapped[Optional[int]] = mapped_column(ForeignKey("Operator.operator_id", onupdate="CASCADE"))
    created_at:   Mapped[datetime]      = mapped_column(DateTime, server_default=func.now())

    component: Mapped["Component"]          = relationship(back_populates="retirements")
    approver:  Mapped[Optional["Operator"]] = relationship(foreign_keys=[approver_id])