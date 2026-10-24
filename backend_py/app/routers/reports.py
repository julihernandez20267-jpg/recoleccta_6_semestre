from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Report, User
from app.schemas import ReportCreateIn, ReportStatusIn, ok
from app.security import get_current_user, require_staff

router = APIRouter(prefix="/reports", tags=["reports"])

# La recolección de aceite es un servicio exclusivo para comercios.
OIL_TYPES = {"aceite de cocina", "aceite de motor"}

STATUS_ALIASES = {
    "pending": "pending",
    "pendiente": "pending",
    "in-progress": "in-progress",
    "in_progress": "in-progress",
    "en proceso": "in-progress",
    "completed": "completed",
    "completado": "completed",
    "atendido": "completed",
}


@router.get("")
def list_reports(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reports = db.scalars(select(Report).order_by(Report.created_at.desc(), Report.id.desc())).all()
    return ok("OK", reports=[r.to_dict() for r in reports])


@router.get("/{report_id}")
def get_report(report_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Reporte no encontrado.")
    return ok("OK", report=report.to_dict())


@router.post("")
def create_report(body: ReportCreateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.type.strip().lower() in OIL_TYPES and user.role != "business":
        raise HTTPException(status_code=403, detail="La recolección de aceite es solo para comercios.")
    report = Report(
        address=body.address.strip(),
        neighborhood=(body.neighborhood or "").strip() or None,
        type=body.type.strip(),
        latitude=body.latitude,
        longitude=body.longitude,
        observations=(body.observations or "").strip() or None,
        reporter_name=(body.reporter_name or "").strip() or user.display_name or user.email.split("@")[0],
        has_evidence=bool(body.has_evidence),
        status="pending",
        created_by=user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return ok("Reporte enviado correctamente.", report=report.to_dict())


@router.put("/{report_id}/status")
def update_status(
    report_id: int,
    body: ReportStatusIn,
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    status = STATUS_ALIASES.get(body.status.strip().lower())
    if status is None:
        raise HTTPException(status_code=400, detail="Estado inválido. Usa pending, in-progress o completed.")
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Reporte no encontrado.")

    report.status = status
    if status == "pending":
        report.assigned_guardian_id = None
        report.guardian_name = None
    else:
        if user.role == "guardian" or report.assigned_guardian_id is None:
            report.assigned_guardian_id = user.id
        report.guardian_name = (body.guardian_name or "").strip() or user.display_name or user.email
    db.commit()
    db.refresh(report)
    return ok("Estado del reporte actualizado.", report=report.to_dict())
