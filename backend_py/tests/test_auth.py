"""Pruebas del registro, inicio de sesión y recuperación de contraseña."""
from app.routers import auth as auth_module


def test_registro_de_ciudadano_entrega_token_y_rol_user(register):
    _, user = register("user")
    assert user["role"] == "user"
    assert user["business"] is None


def test_registro_de_comercio_guarda_los_datos_del_negocio(register):
    _, user = register("business")
    assert user["role"] == "business"
    assert user["business"] == {"name": "Restaurante El Sabor", "type": "Restaurante", "phone": "3001112233"}


def test_comercio_sin_nombre_ni_tipo_es_rechazado(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "sin-datos@recoleccta.test", "password": "Clave123", "accountType": "business"},
    )
    assert res.status_code == 400


def test_correo_repetido_responde_409(client, register):
    _, user = register("user")
    res = client.post("/api/auth/register", json={"email": user["email"], "password": "Clave123"})
    assert res.status_code == 409


def test_contrasena_corta_es_rechazada(client):
    res = client.post("/api/auth/register", json={"email": "corta@recoleccta.test", "password": "123"})
    assert res.status_code == 422


def test_login_con_contrasena_incorrecta_responde_401(client, register):
    _, user = register("user")
    res = client.post("/api/auth/login", json={"email": user["email"], "password": "otra-clave"})
    assert res.status_code == 401


def test_rutas_protegidas_sin_token_responden_401(client):
    assert client.get("/api/reports").status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_recuperacion_de_contrasena_con_codigo_otp(client, register, monkeypatch):
    _, user = register("user")
    codes = []
    monkeypatch.setattr(auth_module, "send_otp_email", lambda email, code: codes.append(code))

    res = client.post("/api/auth/recover-password/request", json={"email": user["email"]})
    assert res.status_code == 200 and len(codes) == 1

    bad = client.post(
        "/api/auth/recover-password/reset",
        json={"email": user["email"], "code": "XXXXXX", "new_password": "NuevaClave1"},
    )
    assert bad.status_code == 400

    good = client.post(
        "/api/auth/recover-password/reset",
        json={"email": user["email"], "code": codes[0], "new_password": "NuevaClave1"},
    )
    assert good.status_code == 200
    login = client.post("/api/auth/login", json={"email": user["email"], "password": "NuevaClave1"})
    assert login.status_code == 200


def test_recuperacion_no_revela_si_el_correo_existe(client):
    res = client.post("/api/auth/recover-password/request", json={"email": "nadie@recoleccta.test"})
    assert res.status_code == 200
