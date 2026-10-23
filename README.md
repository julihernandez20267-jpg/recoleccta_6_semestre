# Recoleccta - Plataforma de Gestión Ambiental y Reciclaje ♻️

**Recoleccta** es una plataforma móvil y backend diseñada para optimizar y reportar puntos de recolección de basura o contenedores llenos, facilitando el trabajo cooperativo entre los administradores, ciudadanos (usuarios) y personal operativo (guardianes).

---

## 🛠️ Stack Tecnológico

### Frontend (Móvil)
- **Framework:** [Expo](https://expo.dev) / React Native (TypeScript).
- **Enrutamiento:** Expo Router (basado en sistema de archivos).
- **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand) (Persistencia de sesión segura y estado de autenticación).
- **Mapas:** `react-native-maps` integrado con el proveedor de Google Maps.
- **Áreas Seguras:** `react-native-safe-area-context` para prevención de recortes en teléfonos modernos.

### Backend (API)
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python).
- **OR/M:** SQLAlchemy (Modelos y relaciones relacionales).
- **Base de Datos:** MySQL (Alojado en la nube con Aiven DB).
- **Recuperación OTP:** Correo HTML vía API de Brevo (compatible con Render gratis) o SMTP en local.

---

## 🚀 Características Principales

1. **Sistema RBAC Relacional:**
   - Control de acceso basado en roles (`admin`, `guardian`, `user`) y permisos específicos almacenados de forma relacional en la base de datos (`roles`, `permissions`, `role_permissions`).
   - Llave foránea directa del rol en la tabla `users` con una propiedad dinámica `@property` para mantener compatibilidad hacia atrás en todo el código.

2. **Gestión de Rutas y Waypoints para Guardianes:**
   - Visualización diferenciada en el mapa operativo: ruta activa en **Verde**, rutas pendientes en cola en **Rojo**. Las rutas completadas desaparecen dinámicamente del mapa.
   - Control interactivo de waypoints (puntos de recolección): botón para avanzar dinámicamente de izquierda a derecha. El punto activo se agranda y resalta en el mapa sin recortes visuales.
   - Botón de término inmediato que finaliza la ruta en curso y activa de inmediato la siguiente asignación pendiente en cola.

3. **Recuperación de Contraseña con OTP Alfanumérico:**
   - Solicitud de código temporal de 6 dígitos enviado por correo electrónico.
   - Validación y actualización de contraseña en caliente con almacenamiento de expiración de token en backend.

4. **Gestión de Foto de Perfil en Base64:**
   - Carga de imágenes desde el carrete en Perfil de Usuario y Perfil de Guardián.
   - Conversión automática a Base64 y almacenamiento optimizado en la base de datos como columna de tipo `MEDIUMTEXT` en MySQL para evitar cualquier límite de tamaño o truncamiento.

5. **Optimización de UX Móvil:**
   - Corrección de área segura en pantallas críticas (como el Login) para evitar superposiciones con los botones físicos o virtuales de navegación del teléfono.
   - Detección de inactividad de sesión mediante un listener de eventos burbuja (`onTouchStart`) que no interfiere ni bloquea el deslizamiento vertical (scroll) del usuario.

---

## 💻 Guía de Instalación y Ejecución

### Requisitos Previos
- Node.js (v18 o superior)
- Python (v3.10 o superior)
- Expo Go instalado en un dispositivo móvil o un simulador móvil configurado.

---

### 1. Servidor Backend (Python)

1. Navega al directorio del backend:
   ```bash
   cd backend_py
   ```
2. Crea e inicia un entorno virtual:
   ```bash
   python -m venv .venv
   # En Windows:
   .venv\Scripts\activate
   # En macOS/Linux:
   source .venv/bin/activate
   ```
3. Instala las dependencias requeridas:
   ```bash
   pip install -r requirements.txt
   ```
4. Copia `backend_py/.env.example` como `backend_py/.env` y llena tus datos (la `DATABASE_URL` es la *Service URI* de Aiven).
5. (Opcional) Crea tablas, roles y datos de ejemplo:
   ```bash
   python seed.py --demo
   ```
   Al arrancar, el servidor crea las tablas, los roles/permisos y el administrador de `ADMIN_EMAIL` automáticamente.
6. Inicia el servidor de desarrollo Uvicorn:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8001
   ```
   Documentación interactiva de la API: <http://localhost:8001/docs>

> **Despliegue en Render + Aiven:** sigue [GUIA_DESPLIEGUE.md](GUIA_DESPLIEGUE.md).

---

### 2. Aplicación Móvil (Expo)

1. En la raíz del proyecto, instala las dependencias de Node:
   ```bash
   npm install
   ```
2. Configura la URL del backend en `config/api.ts` (único lugar) o con `EXPO_PUBLIC_API_URL` en un `.env`. Para el backend local usa `http://TU_IP_LOCAL:8001/api` (o `http://10.0.2.2:8001/api` en el emulador de Android).
3. Inicia el servidor del empaquetador de Expo:
   ```bash
   npx expo start
   ```
4. Abre la consola de Expo, escanea el código QR con la app **Expo Go** en tu dispositivo físico, o presiona `a` para Android o `i` para iOS para abrirlo en tu emulador.

---


