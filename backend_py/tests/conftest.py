"""Configuración de las pruebas: base SQLite temporal y un cliente de la API.

Las variables de entorno se fijan antes de importar la app porque app.config las lee al cargar.
"""
import os
import sys
import tempfile
from pathlib import Path

import pytest

DB_FILE = Path(tempfile.gettempdir()) / "recoleccta_pruebas.db"
if DB_FILE.exists():
    DB_FILE.unlink()

os.environ.update(
    DATABASE_URL=f"sqlite:///{DB_FILE.as_posix()}",
    ADMIN_EMAIL="admin@recoleccta.test",
    ADMIN_PASSWORD="Admin12345",
    JWT_SECRET="secreto-de-pruebas",
    MAIL_PROVIDER="console",
)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin(client):
    res = client.post("/api/auth/login", json={"email": "admin@recoleccta.test", "password": "Admin12345"})
    return auth_header(res.json()["data"]["token"])


@pytest.fixture
def register(client):
    """Crea una cuenta nueva y devuelve (encabezado de autorización, usuario)."""

    def _register(account_type: str = "user", **extra):
        email = f"{account_type}-{os.urandom(4).hex()}@recoleccta.test"
        body = {"email": email, "password": "Clave123", "displayName": "Persona de prueba", "accountType": account_type}
        if account_type == "business":
            body.update(businessName="Restaurante El Sabor", businessType="Restaurante", phone="3001112233")
        body.update(extra)
        res = client.post("/api/auth/register", json=body)
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        return auth_header(data["token"]), data["user"]

    return _register


@pytest.fixture
def guardian(client, admin):
    """Crea un guardián desde el panel de administración y devuelve (encabezado, usuario)."""
    email = f"guardian-{os.urandom(4).hex()}@recoleccta.test"
    res = client.post(
        "/api/admin/guardians",
        json={"email": email, "password": "Clave123", "displayName": "Mateo Rivera"},
        headers=admin,
    )
    user = res.json()["data"]["user"]
    login = client.post("/api/auth/login", json={"email": email, "password": "Clave123"})
    return auth_header(login.json()["data"]["token"]), user
