"""Recoleccta API (FastAPI).

Local:  uvicorn main:app --reload --host 0.0.0.0 --port 8001
Render: uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app import config
from app.database import engine
from app.routers import admin, auth, containers, geo, guardian, reports, routes
from app.seed import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("recoleccta")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Crea las tablas y los datos base al arrancar (Render gratis no tiene consola para correr seed.py).
    try:
        init_db()
        log.info("Base de datos lista. Correo OTP vía: %s", config.MAIL_PROVIDER)
    except Exception:  # noqa: BLE001
        log.exception("No se pudo inicializar la base de datos. Revisa DATABASE_URL / DB_* y que Aiven esté encendido.")
    yield


app = FastAPI(title="Recoleccta API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "datos"
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": f"Dato inválido en '{field}'.", "detail": f"Dato inválido en '{field}': {first.get('msg', '')}"},
    )


for r in (auth.router, admin.router, routes.router, guardian.router, reports.router, containers.router, geo.router):
    app.include_router(r, prefix="/api")


@app.get("/")
def root():
    return {"success": True, "message": "Recoleccta API funcionando", "docs": "/docs"}


@app.get("/api/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
    return {"success": db_ok, "message": "ok" if db_ok else "sin conexión a la base de datos", "data": {"database": db_ok}}
