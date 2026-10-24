from typing import Any, Optional

from pydantic import BaseModel, Field


def ok(message: str = "OK", **data: Any) -> dict:
    """Formato de respuesta que espera la app: { success, message, data }."""
    return {"success": True, "message": message, "data": data}


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=200)


class RegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=200)
    displayName: Optional[str] = Field(default=None, max_length=120)
    accountType: Optional[str] = Field(default="user", max_length=20)  # user | business
    businessName: Optional[str] = Field(default=None, max_length=150)
    businessType: Optional[str] = Field(default=None, max_length=60)
    phone: Optional[str] = Field(default=None, max_length=40)


class ProfileUpdateIn(BaseModel):
    displayName: Optional[str] = Field(default=None, max_length=120)
    photoURL: Optional[str] = None


class RecoverRequestIn(BaseModel):
    email: str


class RecoverResetIn(BaseModel):
    email: str
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=6, max_length=200)


class RoleUpdateIn(BaseModel):
    userId: int
    role: str


class GuardianCreateIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=200)
    displayName: str = Field(min_length=1, max_length=120)


class RouteCreateIn(BaseModel):
    id: Optional[str] = Field(default=None, max_length=64)
    name: str = Field(min_length=1, max_length=150)
    zone: str = Field(min_length=1, max_length=150)
    points: Any  # texto JSON o lista de {latitude, longitude}


class AssignRouteIn(BaseModel):
    guardianId: int
    routeId: str


class ReportCreateIn(BaseModel):
    address: str = Field(min_length=1, max_length=255)
    neighborhood: Optional[str] = Field(default=None, max_length=150)
    type: str = Field(min_length=1, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    observations: Optional[str] = Field(default=None, max_length=5000)
    reporter_name: Optional[str] = Field(default=None, max_length=150)
    has_evidence: Optional[bool] = False


class ReportStatusIn(BaseModel):
    status: str
    guardian_name: Optional[str] = Field(default=None, max_length=150)


class ContainerRequestIn(BaseModel):
    oil_type: str = Field(min_length=1, max_length=20)
    quantity: int = Field(default=1, ge=1, le=10)
    address: str = Field(min_length=1, max_length=255)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    notes: Optional[str] = Field(default=None, max_length=1000)


class ContainerStatusIn(BaseModel):
    status: str
