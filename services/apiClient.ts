import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Render gratis "duerme" el servidor tras 15 min sin uso; la primera petición puede tardar ~1 minuto.
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const { useAuthStore } = require('@/store/useAuthStore');
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Error fetching token dynamically in apiClient interceptor:', error);
  }
  return config;
});

// Si el servidor dice que el token no sirve (expiró o es de otro servidor), cerramos la sesión
// y la app vuelve sola a la pantalla de login.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || '';
    if (status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
      try {
        const { useAuthStore } = require('@/store/useAuthStore');
        if (useAuthStore.getState().token) {
          await useAuthStore.getState().logout();
        }
      } catch {
        // ignorar
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
