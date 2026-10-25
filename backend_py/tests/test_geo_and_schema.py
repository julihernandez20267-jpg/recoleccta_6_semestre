"""Pruebas de la conversión de ubicación a dirección, del cálculo de rutas y de la actualización de la base."""
from sqlalchemy import inspect, text

from app.database import engine
from app.routers import geo
from app.seed import init_db


class FakeResponse:
    """Respuesta simulada de OpenStreetMap / OSRM (las pruebas no salen a internet)."""

    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_direccion_legible_a_partir_de_coordenadas(client, register, monkeypatch):
    headers, _ = register("user")
    geo._reverse.cache_clear()
    payload = {"address": {"road": "Carrera 10", "house_number": "17-20", "neighbourhood": "Santander", "city": "Girardot"}}
    monkeypatch.setattr(geo.httpx, "get", lambda *args, **kwargs: FakeResponse(payload))
    data = client.get("/api/geo/reverse?lat=4.3036&lng=-74.803", headers=headers).json()["data"]
    assert data == {"address": "Carrera 10 # 17-20", "neighborhood": "Santander", "city": "Girardot"}


def test_ruta_en_carro_entre_dos_puntos(client, register, monkeypatch):
    headers, _ = register("user")
    payload = {
        "routes": [
            {"distance": 1210.5, "duration": 150.0, "geometry": {"coordinates": [[-74.803, 4.3036], [-74.7953, 4.2978]]}}
        ]
    }
    monkeypatch.setattr(geo.httpx, "get", lambda *args, **kwargs: FakeResponse(payload))
    params = {"from_lat": 4.3036, "from_lng": -74.803, "to_lat": 4.2978, "to_lng": -74.7953}
    data = client.get("/api/geo/route", params=params, headers=headers).json()["data"]
    assert data["distance_m"] == 1210.5
    assert data["points"][0] == {"latitude": 4.3036, "longitude": -74.803}


def test_columna_nueva_opcional_se_agrega_sin_perder_datos(client, register):
    headers, _ = register("business")
    client.post("/api/containers", json={"oil_type": "motor", "address": "Calle 1"}, headers=headers)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE container_requests DROP COLUMN latitude"))
    init_db()
    columns = {c["name"] for c in inspect(engine).get_columns("container_requests")}
    assert "latitude" in columns
    with engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM container_requests")).scalar() >= 1
