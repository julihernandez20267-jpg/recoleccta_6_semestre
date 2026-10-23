from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Route, RouteAssignment, User, iso, utcnow
from app.routers.auth import get_role, normalize_email
from app.schemas import AssignRouteIn, GuardianCreateIn, RoleUpdateIn, ok
from app.security import hash_password, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = {"admin", "guardian", "user"}


@router.get("/users")
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    # En el listado no mandamos la foto en Base64 (pesa mucho); el perfil propio sí la trae.
    data = []
    for u in users:
        item = u.to_public()
        item["photoURL"] = None
        item["createdAt"] = iso(u.created_at)
        data.append(item)
    return ok("OK", users=data)


@router.post("/users")
def update_user_role(body: RoleUpdateIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    role_name = body.role.strip().lower()
    if role_name not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Rol inválido. Usa admin, guardian o user.")

    target = db.get(User, body.userId)
    if target is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if target.role == "admin" and role_name != "admin":
        admin_role = get_role(db, "admin")
        admins = db.scalar(select(func.count()).select_from(User).where(User.role_id == admin_role.id))
        if admins <= 1:
            raise HTTPException(status_code=400, detail="No puedes quitar el último administrador.")

    # Si deja de ser guardián, sus rutas pendientes se cierran para no quedar huérfanas.
    if target.role == "guardian" and role_name != "guardian":
        for a in db.scalars(
            select(RouteAssignment).where(
                RouteAssignment.guardian_id == target.id, RouteAssignment.status != "completed"
            )
        ):
            a.status = "completed"
            a.completed_at = utcnow()

    target.role_id = get_role(db, role_name).id
    db.commit()
    db.refresh(target)
    return ok("Rol actualizado correctamente.", user=target.to_public())


@router.post("/guardians")
def create_guardian(body: GuardianCreateIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo.")
    guardian = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=body.displayName.strip(),
        role_id=get_role(db, "guardian").id,
    )
    db.add(guardian)
    db.commit()
    db.refresh(guardian)
    return ok("Guardián creado correctamente.", user=guardian.to_public())


@router.get("/routes")
def list_assignments(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Asignaciones vigentes (pendientes o en curso)."""
    rows = db.scalars(
        select(RouteAssignment)
        .where(RouteAssignment.status != "completed")
        .order_by(RouteAssignment.assigned_at.asc())
    ).all()
    return ok("OK", assignments=[a.to_dict(include_route=False) for a in rows])


@router.post("/routes")
def assign_route(body: AssignRouteIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    guardian = db.get(User, body.guardianId)
    if guardian is None or guardian.role != "guardian":
        raise HTTPException(status_code=404, detail="El guardián no existe.")
    route = db.get(Route, body.routeId)
    if route is None:
        raise HTTPException(status_code=404, detail="La ruta no existe.")

    existing = db.scalar(
        select(RouteAssignment).where(
            RouteAssignment.guardian_id == guardian.id,
            RouteAssignment.route_id == route.id,
            RouteAssignment.status != "completed",
        )
    )
    if existing:
        return ok("Esta ruta ya estaba asignada a este guardián.", assignment=existing.to_dict())

    has_active = db.scalar(
        select(RouteAssignment).where(
            RouteAssignment.guardian_id == guardian.id, RouteAssignment.status == "in-progress"
        )
    )
    assignment = RouteAssignment(guardian_id=guardian.id, route_id=route.id)
    if has_active:
        assignment.status = "pending"  # queda en cola (rojo en el mapa)
    else:
        assignment.status = "in-progress"  # primera ruta: se activa de una vez (verde)
        assignment.started_at = utcnow()
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return ok("Ruta asignada correctamente.", assignment=assignment.to_dict())
