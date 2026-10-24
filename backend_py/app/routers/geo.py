from functools import lru_cache

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app import config
from app.models import User
from app.schemas import ok
from app.security import get_current_user

router = APIRouter(prefix="/geo", tags=["geo"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"


@lru_cache(maxsize=512)
def _reverse(lat: float, lng: float) -> dict:
    resp = httpx.get(
        NOMINATIM_URL,
        params={"format": "jsonv2", "lat": lat, "lon": lng, "zoom": 18, "addressdetails": 1, "accept-language": "es"},
        headers={"User-Agent": config.GEOCODER_USER_AGENT},
        timeout=8,
    )
    resp.raise_for_status()
    a = resp.json().get("address") or {}
    street = a.get("road") or a.get("pedestrian") or a.get("footway") or a.get("path")
    number = a.get("house_number")
    # En Colombia la placa va así: "Calle 17 # 10-25".
    address = f"{street} # {number}" if street and number else street
    city = a.get("city") or a.get("town") or a.get("village") or a.get("municipality")
    if city and city.startswith("Perímetro Urbano "):
        city = city.removeprefix("Perímetro Urbano ")
    return {
        "address": address,
        "neighborhood": a.get("neighbourhood") or a.get("suburb") or a.get("quarter") or a.get("city_district"),
        "city": city,
    }


@router.get("/reverse")
def reverse_geocode(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    _: User = Depends(get_current_user),
):
    """Convierte coordenadas en una dirección legible (calle, barrio y ciudad)."""
    try:
        # Redondear a ~10 m permite reutilizar resultados y no saturar el servicio gratuito.
        data = _reverse(round(lat, 4), round(lng, 4))
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status_code=502, detail="No pudimos convertir la ubicación en una dirección.")
    return ok("OK", **data)
