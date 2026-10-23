import ssl
import tempfile

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app import config


def _connect_args() -> dict:
    if config.DATABASE_URL.startswith("sqlite"):
        return {"check_same_thread": False}
    if not config.DB_SSL:
        return {}
    if config.DB_CA_CERT:
        # Verificación completa con el CA de Aiven.
        with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as fh:
            fh.write(config.DB_CA_CERT.replace("\\n", "\n"))
            ca_path = fh.name
        ctx = ssl.create_default_context(cafile=ca_path)
        # Python 3.13 activa una verificación X.509 "estricta" que rechaza algunos CA válidos.
        ctx.verify_flags &= ~getattr(ssl, "VERIFY_X509_STRICT", 0)
        # El certificado de Aiven se emite para el host del servicio, pero no siempre como SAN.
        ctx.check_hostname = False
    else:
        # Conexión cifrada sin verificar el certificado (equivalente a ssl-mode=REQUIRED).
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    return {"ssl": ctx}


engine = create_engine(
    config.DATABASE_URL,
    connect_args=_connect_args(),
    pool_pre_ping=True,   # evita errores cuando Aiven/Render cierran conexiones inactivas
    pool_recycle=280,
    pool_size=5,
    max_overflow=5,
) if not config.DATABASE_URL.startswith("sqlite") else create_engine(
    config.DATABASE_URL, connect_args=_connect_args()
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
