"""Datos base: roles, permisos (RBAC) y el administrador inicial. Es seguro ejecutarlo varias veces."""
import json
import logging
from datetime import datetime

from sqlalchemy import inspect, select, text
from sqlalchemy.schema import CreateColumn
from sqlalchemy.orm import Session

from app import config
from app.database import Base, SessionLocal, engine
from app.models import BusinessProfile, ContainerRequest, Permission, Report, Role, Route, RouteAssignment, User, utcnow
from app.security import hash_password

log = logging.getLogger("recoleccta.seed")

ROLES = {
    "admin": "Administrador: gestiona usuarios, guardianes y rutas",
    "guardian": "Guardián: recorre rutas y atiende reportes",
    "user": "Ciudadano: crea y consulta reportes",
    "business": "Comercio: restaurantes, talleres y gasolineras con recolección prioritaria y de aceite",
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
    "containers.request": "Solicitar bidones para aceite usado",
    "containers.manage": "Atender solicitudes de bidones (solo administrador)",
}

ROLE_PERMISSIONS = {
    "admin": list(PERMISSIONS.keys()),
    "guardian": [
        "reports.create", "reports.read", "reports.update_status", "routes.read", "routes.complete",
        "profile.update",
    ],
    "user": ["reports.create", "reports.read", "profile.update"],
    "business": ["reports.create", "reports.read", "profile.update", "containers.request"],
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
        # Deja los permisos del rol exactamente como están definidos arriba (agrega y quita).
        wanted = set(ROLE_PERMISSIONS[name])
        role.permissions[:] = [p for p in role.permissions if p.code in wanted]
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


def _demo_user(db: Session, email: str, password: str, name: str, role: Role) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, password_hash=hash_password(password), display_name=name, role_id=role.id)
        db.add(user)
        db.flush()
    return user


def seed_demo(db: Session) -> None:
    """Datos de ejemplo en Girardot (python seed.py --demo). Solo para pruebas locales y capturas."""
    roles = {r.name: r for r in db.scalars(select(Role))}

    guardian = _demo_user(db, "guardian@recoleccta.com", "guardian123", "Mateo Rivera", roles["guardian"])
    _demo_user(db, "guardian2@recoleccta.com", "guardian123", "Sofía Castaño", roles["guardian"])
    citizen = _demo_user(db, "usuario@recoleccta.com", "usuario123", "Laura Gómez", roles["user"])
    neighbor = _demo_user(db, "vecino@recoleccta.com", "usuario123", "Andrés Molina", roles["user"])
    restaurant = _demo_user(db, "restaurante@recoleccta.com", "comercio123", "Diana Ruiz", roles["business"])
    workshop = _demo_user(db, "taller@recoleccta.com", "comercio123", "Jorge Prada", roles["business"])
    for user, name, kind, phone in (
        (restaurant, "Asadero El Fogón", "Restaurante", "3157654321"),
        (workshop, "Taller Motos El Puente", "Taller mecánico", "3209876543"),
    ):
        if db.get(BusinessProfile, user.id) is None:
            db.add(BusinessProfile(user_id=user.id, business_name=name, business_type=kind, phone=phone))
    db.flush()

    if db.get(Route, "r-demo-1") is None:
        db.add(Route(id="r-demo-1", name="Ruta Centro", zone="Centro", points=json.dumps([
            {"latitude": 4.30362, "longitude": -74.80312},
            {"latitude": 4.30245, "longitude": -74.80105},
            {"latitude": 4.30118, "longitude": -74.79902},
            {"latitude": 4.29986, "longitude": -74.79735},
        ])))
        db.add(Route(id="r-demo-2", name="Ruta Kennedy", zone="Kennedy", points=json.dumps([
            {"latitude": 4.30094, "longitude": -74.80483},
            {"latitude": 4.29921, "longitude": -74.80652},
            {"latitude": 4.29778, "longitude": -74.80811},
        ])))
        db.add(Route(id="r-demo-3", name="Ruta Alto de la Cruz", zone="Alto de la Cruz", points=json.dumps([
            {"latitude": 4.31115, "longitude": -74.81311},
            {"latitude": 4.30968, "longitude": -74.81102},
        ])))
        db.flush()
        db.add(RouteAssignment(guardian_id=guardian.id, route_id="r-demo-1", status="in-progress", started_at=utcnow()))
        db.add(RouteAssignment(guardian_id=guardian.id, route_id="r-demo-2", status="pending"))

    if not db.scalar(select(Report).limit(1)):
        examples = [
            (citizen, "Calle 17 # 10-25", "Centro", "Plástico", 4.30302, -74.80201, "Contenedor lleno desde ayer, hay bolsas alrededor.", "completed"),
            (citizen, "Carrera 7 # 14-30", "Alto de la Cruz", "Papel", 4.31042, -74.81208, "Cajas de cartón acumuladas en la esquina.", "in-progress"),
            (neighbor, "Avenida Kennedy # 20-11", "Kennedy", "Vidrio", 4.30011, -74.80577, "Botellas junto al punto ecológico.", "pending"),
            (neighbor, "Calle 30 # 9-40", "Santander", "Orgánico", 4.30663, -74.80092, None, "pending"),
            (restaurant, "Carrera 10 # 16-08", "Centro", "Aceite de cocina", 4.30410, -74.80265, "Dos canecas de aceite usado listas para recoger.", "pending"),
            (workshop, "Calle 40 # 16-25", "Altos del Peñón", "Aceite de motor", 4.29780, -74.79530, "Aceite de cambio de motor, unos 20 litros.", "in-progress"),
        ]
        for owner, address, hood, kind, lat, lng, notes, status in examples:
            db.add(Report(
                address=address, neighborhood=hood, type=kind, latitude=lat, longitude=lng, observations=notes,
                reporter_name=owner.display_name, created_by=owner.id, status=status,
                assigned_guardian_id=guardian.id if status != "pending" else None,
                guardian_name=guardian.display_name if status != "pending" else None,
            ))

    if not db.scalar(select(ContainerRequest).limit(1)):
        db.add(ContainerRequest(business_id=restaurant.id, oil_type="cooking", quantity=2, address="Carrera 10 # 16-08, Centro, Girardot",
                                latitude=4.30410, longitude=-74.80265, notes="Entregar en la puerta de la cocina, de 2 a 5 p. m."))
        db.add(ContainerRequest(business_id=workshop.id, oil_type="motor", quantity=1, address="Calle 40 # 16-25, Altos del Peñón, Girardot",
                                latitude=4.29780, longitude=-74.79530, status="delivered", handled_by_name="Administrador"))
    db.commit()


def retire_incompatible_tables() -> None:
    """Pone las tablas existentes al día con los modelos sin perder datos.

    - Si solo faltan columnas opcionales (nullable), se agregan con ALTER TABLE ... ADD COLUMN.
    - Si la tabla es de una versión anterior muy distinta, se renombra (<tabla>_legacy_<fecha>)
      en vez de borrarla, para que create_all cree la nueva.
    """
    insp = inspect(engine)
    model_tables = {t.name: t for t in Base.metadata.sorted_tables}
    present = [name for name in model_tables if name in set(insp.get_table_names())]
    refs = {name: {fk["referred_table"] for fk in insp.get_foreign_keys(name)} for name in present}
    quote = engine.dialect.identifier_preparer.quote

    reasons = {}
    for name in present:
        current = {c["name"] for c in insp.get_columns(name)}
        missing = [c for c in model_tables[name].columns if c.name not in current]
        if missing and all(c.nullable and not c.primary_key for c in missing):
            with engine.begin() as conn:
                for column in missing:
                    ddl = CreateColumn(column).compile(dialect=engine.dialect)
                    log.warning("Tabla '%s': se agrega la columna nueva '%s'.", name, column.name)
                    conn.execute(text(f"ALTER TABLE {quote(name)} ADD COLUMN {ddl}"))
            continue
        if missing:
            missing = {c.name for c in missing}
            reasons[name] = "faltan " + ", ".join(sorted(missing))
        elif refs[name] - set(model_tables):
            reasons[name] = "apunta a tablas viejas"
    # Las tablas que apuntan (llave foránea) a una tabla apartada también se apartan.
    changed = True
    while changed:
        changed = False
        for name in present:
            if name not in reasons and refs[name] & set(reasons):
                reasons[name] = "depende de tablas viejas"
                changed = True

    stamp = datetime.now().strftime("%Y%m%d%H%M")
    with engine.begin() as conn:
        for name, reason in reasons.items():
            legacy = f"{name}_legacy_{stamp}"
            log.warning("Tabla '%s' de una versión anterior (%s): se renombra a '%s'.", name, reason, legacy)
            conn.execute(text(f"ALTER TABLE {quote(name)} RENAME TO {quote(legacy)}"))


def init_db(demo: bool = False) -> None:
    retire_incompatible_tables()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_base(db)
        seed_admin(db)
        if demo:
            seed_demo(db)
