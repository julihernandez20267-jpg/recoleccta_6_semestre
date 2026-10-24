from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ContainerRequest, User
from app.schemas import ContainerRequestIn, ContainerStatusIn, ok
from app.security import get_current_user, require_business, require_staff

router = APIRouter(prefix="/containers", tags=["containers"])

OIL_TYPES = {"cooking", "motor"}
STATUSES = {"pending", "in-progress", "delivered"}


@router.get("")
def list_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """El comercio ve sus solicitudes; el admin y los guardianes ven todas."""
    query = select(ContainerRequest).order_by(ContainerRequest.created_at.desc(), ContainerRequest.id.desc())
    if user.role == "business":
        query = query.where(ContainerRequest.business_id == user.id)
    elif user.role not in ("admin", "guardian"):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver las solicitudes de bidones.")
    return ok("OK", requests=[r.to_dict() for r in db.scalars(query).all()])


@router.post("")
def create_request(body: ContainerRequestIn, user: User = Depends(require_business), db: Session = Depends(get_db)):
    oil_type = body.oil_type.strip().lower()
    if oil_type not in OIL_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de aceite inválido. Usa cooking o motor.")
    request = ContainerRequest(
        business_id=user.id,
        oil_type=oil_type,
        quantity=body.quantity,
        address=body.address.strip(),
        notes=(body.notes or "").strip() or None,
        status="pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return ok("Solicitud de bidón enviada.", request=request.to_dict())


@router.put("/{request_id}/status")
def update_status(
    request_id: int,
    body: ContainerStatusIn,
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    status = body.status.strip().lower()
    if status not in STATUSES:
        raise HTTPException(status_code=400, detail="Estado inválido. Usa pending, in-progress o delivered.")
    request = db.get(ContainerRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    request.status = status
    request.handled_by_name = None if status == "pending" else (user.display_name or user.email)
    db.commit()
    db.refresh(request)
    return ok("Solicitud actualizada.", request=request.to_dict())
