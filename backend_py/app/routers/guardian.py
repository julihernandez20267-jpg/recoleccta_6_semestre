from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RouteAssignment, User, utcnow
from app.schemas import ok
from app.security import require_staff

router = APIRouter(prefix="/guardian", tags=["guardian"])


def resolve_guardian_id(requested: int | None, current: User) -> int:
    """Un guardián solo ve lo suyo; el admin puede consultar cualquier guardián."""
    if current.role == "guardian":
        if requested is not None and requested != current.id:
            raise HTTPException(status_code=403, detail="Solo puedes ver tus propias rutas.")
        return current.id
    if requested is None:
        raise HTTPException(status_code=400, detail="Falta el parámetro guardianId.")
    return requested


def open_assignments(db: Session, guardian_id: int) -> list[RouteAssignment]:
    rows = db.scalars(
        select(RouteAssignment)
        .where(RouteAssignment.guardian_id == guardian_id, RouteAssignment.status != "completed")
        .order_by(RouteAssignment.assigned_at.asc(), RouteAssignment.id.asc())
    ).all()
    return list(rows)


def ensure_one_active(db: Session, rows: list[RouteAssignment]) -> None:
    """Si no hay ruta en curso pero sí pendientes, activa la más antigua."""
    if rows and not any(a.status == "in-progress" for a in rows):
        rows[0].status = "in-progress"
        rows[0].started_at = utcnow()
        db.commit()


def sorted_for_app(rows: list[RouteAssignment]) -> list[RouteAssignment]:
    # La activa primero, luego la cola en orden de asignación.
    return sorted(rows, key=lambda a: (a.status != "in-progress", a.assigned_at, a.id))


@router.get("/route")
def get_guardian_route(
    guardianId: int | None = Query(default=None),
    current: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    gid = resolve_guardian_id(guardianId, current)
    rows = open_assignments(db, gid)
    ensure_one_active(db, rows)
    rows = sorted_for_app(rows)
    active = next((a for a in rows if a.status == "in-progress"), None)
    return ok(
        "OK" if rows else "Sin rutas asignadas.",
        assignment=active.to_dict() if active else None,
        assignments=[a.to_dict() for a in rows],
    )


@router.post("/route/complete")
def complete_route(
    guardianId: int | None = Query(default=None),
    routeId: str | None = Query(default=None),
    current: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    gid = resolve_guardian_id(guardianId, current)
    rows = open_assignments(db, gid)
    if not rows:
        raise HTTPException(status_code=404, detail="No tienes rutas pendientes por completar.")

    if routeId:
        target = next((a for a in rows if a.route_id == routeId), None)
        if target is None:
            raise HTTPException(status_code=404, detail="Esa ruta no está asignada o ya fue completada.")
    else:
        target = next((a for a in rows if a.status == "in-progress"), rows[0])

    target.status = "completed"
    target.completed_at = utcnow()
    db.commit()

    # Activa automáticamente la siguiente ruta en cola.
    remaining = open_assignments(db, gid)
    ensure_one_active(db, remaining)
    remaining = sorted_for_app(remaining)
    nxt = next((a for a in remaining if a.status == "in-progress"), None)
    return ok(
        "Ruta completada." + (" Se activó la siguiente ruta." if nxt else ""),
        completed=target.to_dict(),
        assignment=nxt.to_dict() if nxt else None,
        assignments=[a.to_dict() for a in remaining],
    )
