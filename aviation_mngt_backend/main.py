# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import aircraft, components, installations, maintenance, retirement, flights_lifecycle

app = FastAPI(
    title="航空部件生命周期与维修管理系统",
    description="数据库课程项目后端 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aircraft.router)
app.include_router(components.router)
app.include_router(installations.router)
app.include_router(maintenance.router)
app.include_router(retirement.router)
app.include_router(flights_lifecycle.router)


@app.get("/", tags=["健康检查"])
async def root():
    return {"status": "ok", "message": "航空部件管理系统运行中"}
