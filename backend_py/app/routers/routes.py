import json
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Route, User
from app.schemas import RouteCreateIn, ok
from app.security import require_admin, require_staff

router = APIRouter(prefix="/routes", tags=["routes"])


def normalize_points(raw) -> str:
    """Valida los puntos y los guarda como texto JSON [{latitude, longitude}, ...]."""
    try:
        points = json.loads(raw) if isinstance(raw, str) else raw
        clean = [
            {"latitude": float(p["latitude"]), "longitude": float(p["longitude"])}
            for p in points
        ]
    except (TypeError, ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Los puntos de la ruta no tienen un formato válido.")
    if len(clean) < 2:
        raise HTTPException(status_code=400, detail="La ruta necesita al menos 2 puntos.")
    return json.dumps(clean)


@router.get("")
def list_routes(_: User = Depends(require_staff), db: Session = Depends(get_db)):
    routes = db.scalars(select(Route).order_by(Route.created_at.desc())).all()
    return ok("OK", routes=[r.to_dict() for r in routes])


@router.post("")
def create_route(body: RouteCreateIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    route_id = (body.id or "").strip() or f"r-{int(time.time() * 1000)}"
    if db.get(Route, route_id):
        raise HTTPException(status_code=409, detail="Ya existe una ruta con ese identificador.")
    route = Route(
        id=route_id,
        name=body.name.strip(),
        zone=body.zone.strip(),
        points=normalize_points(body.points),
        created_by=admin.id,
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return ok("Ruta creada correctamente.", route=route.to_dict())


@router.delete("/{route_id}")
def delete_route(route_id: str, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    route = db.get(Route, route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="La ruta no existe.")
    db.delete(route)
    db.commit()
    return ok("Ruta eliminada.")
