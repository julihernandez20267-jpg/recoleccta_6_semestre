"""Pruebas de administración: roles, rutas y asignación a guardianes."""

PUNTOS = [{"latitude": 4.3036, "longitude": -74.803}, {"latitude": 4.3010, "longitude": -74.799}]


def test_admin_cambia_el_rol_de_un_usuario(client, admin, register):
    _, user = register("user")
    res = client.post("/api/admin/users", json={"userId": user["uid"], "role": "guardian"}, headers=admin)
    assert res.json()["data"]["user"]["role"] == "guardian"


def test_no_se_puede_quitar_el_ultimo_administrador(client, admin):
    me = client.get("/api/auth/me", headers=admin).json()["data"]["user"]
    res = client.post("/api/admin/users", json={"userId": me["uid"], "role": "user"}, headers=admin)
    assert res.status_code == 400


def test_usuario_comun_no_accede_a_administracion(client, register):
    headers, _ = register("user")
    assert client.get("/api/admin/users", headers=headers).status_code == 403


def test_ruta_con_un_solo_punto_es_rechazada(client, admin):
    res = client.post("/api/routes", json={"name": "Ruta corta", "zone": "Centro", "points": PUNTOS[:1]}, headers=admin)
    assert res.status_code == 400


def test_asignar_y_completar_rutas_activa_la_siguiente(client, admin, guardian):
    guardian_headers, guardian_user = guardian
    route_ids = []
    for name in ("Ruta Centro", "Ruta Kennedy"):
        res = client.post("/api/routes", json={"name": name, "zone": "Girardot", "points": PUNTOS}, headers=admin)
        route_ids.append(res.json()["data"]["route"]["id"])
        client.post("/api/admin/routes", json={"guardianId": guardian_user["uid"], "routeId": route_ids[-1]}, headers=admin)

    current = client.get("/api/guardian/route", headers=guardian_headers).json()["data"]
    assert current["assignment"]["routeId"] == route_ids[0]
    assert len(current["assignments"]) == 2

    done = client.post(f"/api/guardian/route/complete?routeId={route_ids[0]}", headers=guardian_headers).json()["data"]
    assert done["assignment"]["routeId"] == route_ids[1]
    assert done["assignment"]["status"] == "in-progress"
