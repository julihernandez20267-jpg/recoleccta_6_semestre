# Guía: volver a poner Recoleccta en línea (Aiven + Render)

Tiempo aproximado: 30–40 minutos. Todo es gratis.

Orden: **1. GitHub → 2. Aiven (base de datos) → 3. Brevo (correo, opcional) → 4. Render (backend) → 5. App**

---

## 1. Subir el proyecto a GitHub

Render despliega desde un repositorio de GitHub.

1. Entra a <https://github.com/new>, crea un repositorio (por ejemplo `recoleccta`). Puede ser privado.
2. En la carpeta del proyecto (la que tiene `package.json`, `render.yaml` y `backend_py/`), abre una terminal:

   ```bash
   git init
   git add .
   git commit -m "Recoleccta con backend nuevo"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/recoleccta.git
   git push -u origin main
   ```

   > `node_modules`, `.env` y `.venv` ya están en `.gitignore`: no se suben. **Nunca subas tu `.env`.**

---

## 2. Base de datos MySQL en Aiven

1. Crea la cuenta en <https://console.aiven.io/signup>.
2. **Create service** → **MySQL** → plan **Free** → elige una región cercana → **Create service**.
3. Espera a que el estado diga **Running** (2–5 minutos).
4. En la pestaña **Overview** → **Connection information**, copia la **Service URI**. Se ve así:

   ```
   mysql://avnadmin:AVNS_xxxxxxxx@mysql-xxxx-tuusuario.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
   ```

   Esa es tu `DATABASE_URL`. No tienes que crear tablas a mano: el backend las crea solo al arrancar.

> ⚠️ El plan gratis de Aiven **apaga el servicio si no se usa** por un tiempo (te avisa por correo antes). Si la app deja de funcionar, entra a Aiven y dale **Power on**.

---

## 3. Correo para el código de recuperación (opcional, recomendado)

El plan gratis de Render **bloquea el SMTP** (Gmail por SMTP no funciona ahí). Por eso el backend usa **Brevo**, que envía por HTTP (300 correos/día gratis).

1. Crea la cuenta en <https://www.brevo.com>.
2. Menú de tu cuenta → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender** con tu correo (puede ser tu Gmail) y confírmalo desde el correo que te llega.
3. Menú de tu cuenta → **SMTP & API** → pestaña **API Keys** → **Generate a new API key**. Copia la clave (empieza por `xkeysib-`).

Si te saltas este paso, la recuperación de contraseña igual funciona, pero el código **no llega por correo**: aparece en los **Logs** de Render (`Código OTP para ...`).

---

## 4. Backend en Render

1. Crea la cuenta en <https://dashboard.render.com> (entra con GitHub, es más fácil).
2. **New +** → **Blueprint** → conecta tu repositorio `recoleccta`. Render lee el archivo `render.yaml` y te pide estas variables:

   | Variable | Qué poner |
   |---|---|
   | `DATABASE_URL` | La Service URI de Aiven (paso 2) |
   | `ADMIN_EMAIL` | Tu correo de administrador |
   | `ADMIN_PASSWORD` | Una contraseña para ese administrador |
   | `BREVO_API_KEY` | La clave de Brevo (o déjala vacía) |
   | `MAIL_FROM` | El correo que verificaste en Brevo (o vacío) |

   `JWT_SECRET` se genera solo. Dale **Apply / Deploy**.

   <details><summary>¿No te aparece Blueprint? Hazlo manual</summary>

   **New +** → **Web Service** → tu repositorio, y llena:
   - Root Directory: `backend_py`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance type: Free
   - En **Environment** agrega las variables de la tabla, más `PYTHON_VERSION=3.13.1` y `JWT_SECRET` con una frase larga inventada.
   </details>

3. Espera a que diga **Live**. Arriba verás tu URL, por ejemplo `https://recoleccta-api.onrender.com` (si el nombre está ocupado, Render le agrega letras: `recoleccta-api-ab12.onrender.com`).
4. Prueba en el navegador: `https://TU-URL.onrender.com/api/health` → debe responder `"database": true`.
   También puedes ver y probar todos los endpoints en `https://TU-URL.onrender.com/docs`.

> ⚠️ Render gratis **duerme** el servidor después de 15 minutos sin uso. La primera petición después tarda ~1 minuto; luego va normal. La app ya espera ese tiempo.

---

## 5. Conectar la app al backend nuevo

Abre `config/api.ts` y cambia esta línea por tu URL (con `/api` al final):

```ts
const DEFAULT_API_URL = 'https://TU-URL.onrender.com/api';
```

(O crea un archivo `.env` en la raíz de la app con `EXPO_PUBLIC_API_URL=https://TU-URL.onrender.com/api`.)

Luego:

```bash
npm install
npx expo start
```

Entra con el `ADMIN_EMAIL` / `ADMIN_PASSWORD` que pusiste en Render. Desde el panel de administrador ya puedes crear guardianes, rutas y asignarlas.

> Si en tu celular la app tenía una sesión guardada del servidor viejo, se cerrará sola y te mandará al login. Es normal.

---

## Problemas comunes

| Síntoma | Solución |
|---|---|
| `/api/health` dice `"database": false` | Revisa `DATABASE_URL` en Render y que Aiven esté **Running**. Después, en Render: **Manual Deploy → Restart service**. |
| No puedo entrar como admin | `ADMIN_EMAIL`/`ADMIN_PASSWORD` solo crean el admin si **todavía no hay ninguno**. Revisa los Logs de Render. |
| "Error de conexión" en la app | Revisa la URL en `config/api.ts` (debe terminar en `/api`) y abre `/api/health` en el navegador para despertar el servidor. |
| No llega el código OTP | Revisa `BREVO_API_KEY` y que `MAIL_FROM` esté verificado en Brevo; mira la carpeta de spam. El código también queda en los Logs de Render. |
| Build falla en Render | Verifica que **Root Directory** sea `backend_py`. |

## Datos de ejemplo (opcional)

En tu computador, con el `.env` apuntando a Aiven:

```bash
cd backend_py
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python seed.py --demo
```

Crea `guardian@recoleccta.com / guardian123`, `usuario@recoleccta.com / usuario123`, 2 rutas y 2 reportes.
