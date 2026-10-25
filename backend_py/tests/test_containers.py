"""Pruebas de las solicitudes de bidones para aceite (comercio y administrador)."""

PEDIDO = {
    "oil_type": "cooking",
    "quantity": 2,
    "address": "Calle 40, Altos del Peñón",
    "latitude": 4.2978,
    "longitude": -74.7953,
}


def test_comercio_pide_bidon_con_punto_de_entrega(client, register):
    headers, _ = register("business")
    res = client.post("/api/containers", json=PEDIDO, headers=headers)
    request = res.json()["data"]["request"]
    assert res.status_code == 200
    assert request["status"] == "pending"
    assert (request["latitude"], request["longitude"]) == (4.2978, -74.7953)
    assert request["business_name"] == "Restaurante El Sabor"


def test_ciudadano_y_guardian_no_pueden_pedir_ni_ver_bidones(client, register, guardian):
    citizen, _ = register("user")
    assert client.post("/api/containers", json=PEDIDO, headers=citizen).status_code == 403
    assert client.get("/api/containers", headers=citizen).status_code == 403
    assert client.get("/api/containers", headers=guardian[0]).status_code == 403


def test_tipo_de_aceite_invalido_es_rechazado(client, register):
    headers, _ = register("business")
    res = client.post("/api/containers", json={**PEDIDO, "oil_type": "gasolina"}, headers=headers)
    assert res.status_code == 400


def test_comercio_solo_ve_sus_propios_bidones(client, register):
    first, _ = register("business")
    second, _ = register("business")
    client.post("/api/containers", json=PEDIDO, headers=first)
    assert client.get("/api/containers", headers=second).json()["data"]["requests"] == []


def test_solo_el_admin_cambia_el_estado_y_queda_registrado_quien_lo_atendio(client, register, admin, guardian):
    business, _ = register("business")
    request_id = client.post("/api/containers", json=PEDIDO, headers=business).json()["data"]["request"]["id"]
    url = f"/api/containers/{request_id}/status"

    assert client.put(url, json={"status": "delivered"}, headers=business).status_code == 403
    assert client.put(url, json={"status": "delivered"}, headers=guardian[0]).status_code == 403

    res = client.put(url, json={"status": "in-progress"}, headers=admin)
    assert res.json()["data"]["request"]["status"] == "in-progress"
    res = client.put(url, json={"status": "delivered"}, headers=admin)
    assert res.json()["data"]["request"]["status"] == "delivered"
    assert res.json()["data"]["request"]["handled_by_name"]


def test_detalle_de_bidon_lo_ven_el_admin_y_el_dueno(client, register, admin):
    owner, _ = register("business")
    other, _ = register("business")
    request_id = client.post("/api/containers", json=PEDIDO, headers=owner).json()["data"]["request"]["id"]
    assert client.get(f"/api/containers/{request_id}", headers=admin).status_code == 200
    assert client.get(f"/api/containers/{request_id}", headers=owner).status_code == 200
    assert client.get(f"/api/containers/{request_id}", headers=other).status_code == 403
