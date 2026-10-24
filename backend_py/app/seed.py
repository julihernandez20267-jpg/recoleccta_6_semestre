"""Datos base: roles, permisos (RBAC) y el administrador inicial. Es seguro ejecutarlo varias veces."""
import json
import logging
from datetime import datetime

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app import config
from app.database import Base, SessionLocal, engine
from app.models import Permission, Report, Role, Route, RouteAssignment, User
from app.security import hash_password

log = logging.getLogger("recoleccta.seed")

ROLES = {
    "admin": "Administrador: gestiona usuarios, guardianes y rutas",
    "guardian": "Guardián: recorre rutas y atiende reportes",
    "user": "Ciudadano: crea y consulta reportes",
}

PERMISSIONS = {
    "reports.create": "Crear reportes",
    "reports.read": "Ver reportes",
    "reports.update_status": "Cambiar el estado de un reporte",
    "routes.read": "Ver rutas",
    "routes.manage": "Crear y asignar rutas",
    "routes.complete": "Completar rutas asignadas",
    "users.manage": "Gestionar usuarios y roles",
    "guardians.create": "Crear guardianes",
    "profile.update": "Editar el perfil propio",
}

ROLE_PERMISSIONS = {
    "admin": list(PERMISSIONS.keys()),
    "guardian": ["reports.create", "reports.read", "reports.update_status", "routes.read", "routes.complete", "profile.update"],
    "user": ["reports.create", "reports.read", "profile.update"],
}


def seed_base(db: Session) -> None:
    perms = {}
    for code, desc in PERMISSIONS.items():
        p = db.scalar(select(Permission).where(Permission.code == code))
        if p is None:
            p = Permission(code=code, description=desc)
            db.add(p)
        perms[code] = p
    db.flush()

    for name, desc in ROLES.items():
        role = db.scalar(select(Role).where(Role.name == name))
        if role is None:
            role = Role(name=name, description=desc)
            db.add(role)
            db.flush()
        current = {p.code for p in role.permissions}
        for code in ROLE_PERMISSIONS[name]:
            if code not in current:
                role.permissions.append(perms[code])
    db.commit()


def seed_admin(db: Session) -> None:
    admin_role = db.scalar(select(Role).where(Role.name == "admin"))
    if db.scalar(select(User).where(User.role_id == admin_role.id)):
        return
    if not config.ADMIN_EMAIL or not config.ADMIN_PASSWORD:
        log.warning(
            "No hay ningún administrador. Define ADMIN_EMAIL y ADMIN_PASSWORD en las variables de entorno "
            "y reinicia el servidor para crearlo."
        )
        return
    existing = db.scalar(select(User).where(User.email == config.ADMIN_EMAIL))
    if existing:
        existing.role_id = admin_role.id  # asciende la cuenta existente
    else:
        db.add(
            User(
                email=config.ADMIN_EMAIL,
                password_hash=hash_password(config.ADMIN_PASSWORD),
                display_name=config.ADMIN_NAME,
                role_id=admin_role.id,
            )
        )
    db.commit()
    log.info("Administrador inicial listo: %s", config.ADMIN_EMAIL)


def seed_demo(db: Session) -> None:
    """Datos de ejemplo opcionales (python seed.py --demo)."""
    guardian_role = db.scalar(select(Role).where(Role.name == "guardian"))
    user_role = db.scalar(select(Role).where(Role.name == "user"))

    guardian = db.scalar(select(User).where(User.email == "guardian@recoleccta.com"))
    if guardian is None:
        guardian = User(email="guardian@recoleccta.com", password_hash=hash_password("guardian123"),
                        display_name="Mateo Rivera", role_id=guardian_role.id)
        db.add(guardian)
    citizen = db.scalar(select(User).where(User.email == "usuario@recoleccta.com"))
    if citizen is None:
        citizen = User(email="usuario@recoleccta.com", password_hash=hash_password("usuario123"),
                       display_name="Laura Gómez", role_id=user_role.id)
        db.add(citizen)
    db.flush()

    if db.get(Route, "r-demo-1") is None:
        db.add(Route(id="r-demo-1", name="Ruta Centro", zone="La Candelaria", points=json.dumps([
            {"latitude": 4.5981, "longitude": -74.0760},
            {"latitude": 4.6010, "longitude": -74.0725},
            {"latitude": 4.6045, "longitude": -74.0700},
        ])))
        db.add(Route(id="r-demo-2", name="Ruta Teusaquillo", zone="Teusaquillo", points=json.dumps([
            {"latitude": 4.6272, "longitude": -74.0732},
            {"latitude": 4.6310, "longitude": -74.0690},
            {"latitude": 4.6345, "longitude": -74.0655},
        ])))
        db.flush()
        db.add(RouteAssignment(guardian_id=guardian.id, route_id="r-demo-1", status="in-progress"))
        db.add(RouteAssignment(guardian_id=guardian.id, route_id="r-demo-2", status="pending"))

    if not db.scalar(select(Report).limit(1)):
        db.add_all([
            Report(address="Cra 7 # 12-40", neighborhood="La Candelaria", type="Residuo mixto",
                   latitude=4.5995, longitude=-74.0745, observations="Contenedor lleno desde ayer.",
                   reporter_name="Laura Gómez", created_by=citizen.id),
            Report(address="Calle 39 # 17-20", neighborhood="Teusaquillo", type="Reciclable",
                   latitude=4.6290, longitude=-74.0710, observations="Cartón acumulado en la esquina.",
                   reporter_name="Laura Gómez", created_by=citizen.id),
        ])
    db.commit()


def retire_incompatible_tables() -> None:
    """Si la base ya tenía tablas de una versión anterior con otras columnas, las renombra
    (<tabla>_legacy_<fecha>) en vez de borrarlas, para que create_all cree las nuevas."""
    insp = inspect(engine)
    existing = set(insp.get_table_names())
    stamp = datetime.now().strftime("%Y%m%d%H%M")
    quote = engine.dialect.identifier_preparer.quote
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing:
                continue
            current = {c["name"] for c in insp.get_columns(table.name)}
            missing = {c.name for c in table.columns} - current
            if missing:
                legacy = f"{table.name}_legacy_{stamp}"
                log.warning("Tabla '%s' de una versión anterior (faltan %s): se renombra a '%s'.",
                            table.name, ", ".join(sorted(missing)), legacy)
                conn.execute(text(f"ALTER TABLE {quote(table.name)} RENAME TO {quote(legacy)}"))


def init_db(demo: bool = False) -> None:
    retire_incompatible_tables()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_base(db)
        seed_admin(db)
        if demo:
            seed_demo(db)
