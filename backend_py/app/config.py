"""Configuración central leída desde variables de entorno (.env en local, Environment en Render)."""
import os
from urllib.parse import quote_plus, urlparse, unquote

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "si", "sí", "on")


def _build_database_url() -> str:
    """Acepta DATABASE_URL (la "Service URI" de Aiven) o las variables DB_* sueltas."""
    raw = os.getenv("DATABASE_URL", "").strip()
    if raw:
        if raw.startswith("sqlite"):
            return raw
        # Aiven entrega: mysql://avnadmin:clave@host:puerto/defaultdb?ssl-mode=REQUIRED
        parsed = urlparse(raw)
        user = unquote(parsed.username or "")
        password = unquote(parsed.password or "")
        host = parsed.hostname or "localhost"
        port = parsed.port or 3306
        name = (parsed.path or "/defaultdb").lstrip("/") or "defaultdb"
        return f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{name}?charset=utf8mb4"

    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    name = os.getenv("DB_NAME", "defaultdb")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASS", "")
    return f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{name}?charset=utf8mb4"


DATABASE_URL = _build_database_url()
# Aiven exige SSL. En local (MySQL sin SSL) pon DB_SSL=false.
DB_SSL = _bool("DB_SSL", default="localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL)
# Opcional: contenido del certificado CA de Aiven (ca.pem) para verificar el servidor.
DB_CA_CERT = os.getenv("DB_CA_CERT", "").strip()

JWT_SECRET = os.getenv("JWT_SECRET", "cambia-este-secreto-en-produccion")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 días

# Administrador inicial: se crea solo si todavía no existe ningún admin.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Administrador")

# Correo para el código OTP de recuperación.
#   brevo -> API HTTP de Brevo (funciona en el plan gratis de Render)
#   smtp  -> SMTP clásico (solo en local o planes pagos de Render: el plan gratis bloquea SMTP)
#   console -> no envía, solo imprime el código en los logs
MAIL_PROVIDER = os.getenv("MAIL_PROVIDER", "").strip().lower()
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", "") or MAIL_USERNAME
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Recoleccta")
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_STARTTLS = _bool("MAIL_STARTTLS", True)
MAIL_SSL_TLS = _bool("MAIL_SSL_TLS", False)

OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "15"))

if not MAIL_PROVIDER:
    if BREVO_API_KEY:
        MAIL_PROVIDER = "brevo"
    elif MAIL_USERNAME and MAIL_PASSWORD:
        MAIL_PROVIDER = "smtp"
    else:
        MAIL_PROVIDER = "console"

# Conversión de coordenadas a dirección (OpenStreetMap Nominatim). Su política de uso pide
# identificar la aplicación con un User-Agent que incluya un contacto.
GEOCODER_USER_AGENT = os.getenv("GEOCODER_USER_AGENT", "Recoleccta/1.0 (proyecto academico; recoleccta@gmail.com)")
