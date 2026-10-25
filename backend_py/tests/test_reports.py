"""Pruebas de reportes: creación, prioridad de comercios, aceite y cambio de estado."""

PUNTO = {"address": "Carrera 10 # 17-20", "latitude": 4.3036, "longitude": -74.803}


def crear_reporte(client, headers, tipo):
    res = client.post("/api/reports", json={**PUNTO, "type": tipo}, headers=headers)
    return res


def test_ciudadano_crea_reporte_en_estado_pendiente(client, register):
    headers, _ = register("user")
    res = crear_reporte(client, headers, "Plástico")
    report = res.json()["data"]["report"]
    assert res.status_code == 200
    assert report["status"] == "pending"
    assert report["is_priority"] is False


def test_ciudadano_no_puede_pedir_recoleccion_de_aceite(client, register):
    headers, _ = register("user")
    assert crear_reporte(client, headers, "Aceite de cocina").status_code == 403


def test_reporte_de_comercio_queda_con_prioridad_y_datos_del_negocio(client, register):
    headers, _ = register("business")
    report = crear_reporte(client, headers, "Aceite de motor").json()["data"]["report"]
    assert report["is_priority"] is True
    assert report["business_name"] == "Restaurante El Sabor"
    assert report["business_phone"] == "3001112233"


def test_guardian_toma_y_completa_un_reporte(client, register, guardian):
    citizen, _ = register("user")
    report_id = crear_reporte(client, citizen, "Vidrio").json()["data"]["report"]["id"]
    guardian_headers, _ = guardian

    taken = client.put(f"/api/reports/{report_id}/status", json={"status": "in-progress"}, headers=guardian_headers)
    assert taken.json()["data"]["report"]["status"] == "in-progress"
    assert taken.json()["data"]["report"]["guardian_name"] == "Mateo Rivera"

    done = client.put(f"/api/reports/{report_id}/status", json={"status": "completed"}, headers=guardian_headers)
    assert done.json()["data"]["report"]["status"] == "completed"


def test_ciudadano_no_puede_cambiar_el_estado_de_un_reporte(client, register):
    headers, _ = register("user")
    report_id = crear_reporte(client, headers, "Papel").json()["data"]["report"]["id"]
    res = client.put(f"/api/reports/{report_id}/status", json={"status": "completed"}, headers=headers)
    assert res.status_code == 403


def test_estado_invalido_es_rechazado(client, register, guardian):
    citizen, _ = register("user")
    report_id = crear_reporte(client, citizen, "Papel").json()["data"]["report"]["id"]
    res = client.put(f"/api/reports/{report_id}/status", json={"status": "perdido"}, headers=guardian[0])
    assert res.status_code == 400


def test_coordenadas_fuera_de_rango_son_rechazadas(client, register):
    headers, _ = register("user")
    res = client.post("/api/reports", json={**PUNTO, "latitude": 200, "type": "Papel"}, headers=headers)
    assert res.status_code == 422
