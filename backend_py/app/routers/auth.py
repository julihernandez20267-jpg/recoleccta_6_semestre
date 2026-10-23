import re
import secrets
import string
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import config
from app.database import get_db
from app.email_service import send_otp_email
from app.models import Role, User, utcnow
from app.schemas import (
    LoginIn,
    ProfileUpdateIn,
    RecoverRequestIn,
    RecoverResetIn,
    RegisterIn,
    ok,
)
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
OTP_ALPHABET = string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789"
MAX_OTP_ATTEMPTS = 5


def normalize_email(email: str) -> str:
    email = email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="El correo electrónico no es válido.")
    return email


def get_role(db: Session, name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == name))
    if role is None:
        raise HTTPException(status_code=500, detail=f"El rol '{name}' no existe en la base de datos.")
    return role


def session_payload(user: User) -> dict:
    token, expires_at = create_access_token(user)
    return {"user": user.to_public(), "token": token, "expiresAt": expires_at}


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo.")

    user = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=(body.displayName or "").strip() or None,
        role_id=get_role(db, "user").id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return ok("Cuenta creada correctamente.", **session_payload(user))


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos.")
    return ok("Inicio de sesión exitoso.", **session_payload(user))


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return ok("OK", user=user.to_public())


@router.put("/profile")
def update_profile(body: ProfileUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.displayName is not None:
        user.display_name = body.displayName.strip() or None
    if body.photoURL is not None:
        if len(body.photoURL) > 12_000_000:
            raise HTTPException(status_code=413, detail="La imagen es demasiado grande.")
        user.photo_url = body.photoURL or None
    db.add(user)
    db.commit()
    db.refresh(user)
    return ok("Perfil actualizado.", user=user.to_public())


@router.post("/recover-password/request")
def recover_request(body: RecoverRequestIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    user = db.scalar(select(User).where(User.email == email))
    if user is not None:
        code = "".join(secrets.choice(OTP_ALPHABET) for _ in range(6))
        user.otp_code = hash_password(code)
        user.otp_expires_at = utcnow() + timedelta(minutes=config.OTP_EXPIRE_MINUTES)
        user.otp_attempts = 0
        db.commit()
        background.add_task(send_otp_email, email, code)
    # Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
    return ok("Si el correo está registrado, te enviamos un código de 6 caracteres.")


@router.post("/recover-password/reset")
def recover_reset(body: RecoverResetIn, db: Session = Depends(get_db)):
    email = normalize_email(body.email)
    code = body.code.strip().upper()
    user = db.scalar(select(User).where(User.email == email))
    invalid = HTTPException(status_code=400, detail="El código es inválido o ya venció. Solicita uno nuevo.")

    if user is None or not user.otp_code or not user.otp_expires_at:
        raise invalid
    if user.otp_expires_at < utcnow() or user.otp_attempts >= MAX_OTP_ATTEMPTS:
        user.otp_code = None
        user.otp_expires_at = None
        db.commit()
        raise invalid
    if not verify_password(code, user.otp_code):
        user.otp_attempts += 1
        db.commit()
        raise invalid

    user.password_hash = hash_password(body.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    db.commit()
    return ok("Contraseña actualizada. Ya puedes iniciar sesión.")
