// URL del backend. Es el ÚNICO lugar que tienes que cambiar.
//
// Opción 1: crea un archivo .env en la raíz de la app con
//   EXPO_PUBLIC_API_URL=https://TU-SERVICIO.onrender.com/api
// Opción 2: cambia el valor por defecto de abajo.
//
// Para probar con el backend en tu computador usa http://TU_IP_LOCAL:8001/api
// (o http://10.0.2.2:8001/api desde el emulador de Android).
const DEFAULT_API_URL = 'https://recoleccta-api.onrender.com/api';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
