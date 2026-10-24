from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Texto largo: MEDIUMTEXT en MySQL (hasta 16 MB, para fotos en Base64), TEXT en otros motores.
LongText = Text().with_variant(MEDIUMTEXT(), "mysql")


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt: datetime | None) -> str | None:
    """Fecha en ISO-8601 UTC con 'Z' (la app hace new Date(...))."""
    return dt.isoformat() + "Z" if dt else None


role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))

    permissions = relationship("Permission", secondary=role_permissions, lazy="selectin")


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(120))
    photo_url: Mapped[str | None] = mapped_column(LongText)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    otp_code: Mapped[str | None] = mapped_column(String(255))
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    role_obj = relationship("Role", lazy="joined")
    business = relationship("BusinessProfile", uselist=False, lazy="selectin")

    @property
    def role(self) -> str:
        """Compatibilidad: el resto del código usa user.role como texto."""
        return self.role_obj.name if self.role_obj else "user"

    def to_public(self) -> dict:
        return {
            "uid": self.id,
            "email": self.email,
            "role": self.role,
            "displayName": self.display_name,
            "photoURL": self.photo_url,
            "business": self.business.to_dict() if self.business else None,
        }


class BusinessProfile(Base):
    """Datos del comercio (restaurante, taller, gasolinera...). Tabla aparte para no alterar 'users'."""

    __tablename__ = "business_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    business_name: Mapped[str] = mapped_column(String(150), nullable=False)
    business_type: Mapped[str] = mapped_column(String(60), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {"name": self.business_name, "type": self.business_type, "phone": self.phone}


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    zone: Mapped[str] = mapped_column(String(150), nullable=False)
    points: Mapped[str] = mapped_column(LongText, nullable=False)  # JSON: [{"latitude":..,"longitude":..}]
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "zone": self.zone,
            "points": self.points,
            "createdAt": iso(self.created_at),
        }


class RouteAssignment(Base):
    __tablename__ = "route_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guardian_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    route_id: Mapped[str] = mapped_column(ForeignKey("routes.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending | in-progress | completed
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    route = relationship("Route", lazy="joined")
    guardian = relationship("User", lazy="joined")

    def to_dict(self, include_route: bool = True) -> dict:
        data = {
            "id": self.id,
            "guardianId": self.guardian_id,
            "routeId": self.route_id,
            "status": self.status,
            "assignedAt": iso(self.assigned_at),
            "startedAt": iso(self.started_at),
            "completedAt": iso(self.completed_at),
        }
        if self.guardian is not None:
            data["guardianName"] = self.guardian.display_name or self.guardian.email
        if include_route and self.route is not None:
            data["route"] = self.route.to_dict()
        return data


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    neighborhood: Mapped[str | None] = mapped_column(String(150))
    type: Mapped[str] = mapped_column(String(80), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    observations: Mapped[str | None] = mapped_column(Text)
    reporter_name: Mapped[str | None] = mapped_column(String(150))
    has_evidence: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    assigned_guardian_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    guardian_name: Mapped[str | None] = mapped_column(String(150))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    creator = relationship("User", foreign_keys=[created_by], lazy="joined")

    def to_dict(self) -> dict:
        # Los reportes de comercios tienen prioridad: se calcula según quién lo creó.
        business = self.creator.business if self.creator is not None and self.creator.role == "business" else None
        return {
            "id": self.id,
            "address": self.address,
            "neighborhood": self.neighborhood,
            "type": self.type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "observations": self.observations,
            "reporter_name": self.reporter_name,
            "has_evidence": bool(self.has_evidence),
            "status": self.status,
            "created_by": self.created_by,
            "assigned_guardian_id": self.assigned_guardian_id,
            "guardian_name": self.guardian_name,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
            "is_priority": business is not None,
            "business_name": business.business_name if business else None,
            "business_phone": business.phone if business else None,
        }


class ContainerRequest(Base):
    """Solicitud de bidón para guardar aceite usado; la empresa lo lleva al comercio."""

    __tablename__ = "container_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    oil_type: Mapped[str] = mapped_column(String(20), nullable=False)  # cooking | motor
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending | in-progress | delivered
    handled_by_name: Mapped[str | None] = mapped_column(String(150))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    requester = relationship("User", lazy="joined")

    def to_dict(self) -> dict:
        business = self.requester.business if self.requester is not None else None
        return {
            "id": self.id,
            "business_id": self.business_id,
            "business_name": business.business_name if business else None,
            "business_type": business.business_type if business else None,
            "business_phone": business.phone if business else None,
            "oil_type": self.oil_type,
            "quantity": self.quantity,
            "address": self.address,
            "notes": self.notes,
            "status": self.status,
            "handled_by_name": self.handled_by_name,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
