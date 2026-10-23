import apiClient from './apiClient';
import type { AuthResponse, AuthSession } from '@/types/auth';

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  try {
    const res = await apiClient.post<AuthResponse>('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    const json = res.data;

    if (!json.success || !json.data?.user || !json.data?.token) {
      throw new Error(json.message || 'Respuesta inválida del servidor.');
    }

    return {
      user: json.data.user,
      token: json.data.token,
      expiresAt: json.data.expiresAt,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Error al iniciar sesión.';
    throw new Error(errorMessage);
  }
}

export async function registerUser(email: string, password: string): Promise<AuthSession> {
  try {
    const res = await apiClient.post<AuthResponse>('/auth/register', {
      email: email.trim().toLowerCase(),
      password,
    });

    const json = res.data;

    if (!json.success || !json.data?.user || !json.data?.token) {
      throw new Error(json.message || 'Respuesta inválida del servidor.');
    }

    return {
      user: json.data.user,
      token: json.data.token,
      expiresAt: json.data.expiresAt,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Error al registrarse.';
    throw new Error(errorMessage);
  }
}

export async function requestPasswordRecovery(email: string): Promise<any> {
  try {
    const res = await apiClient.post('/auth/recover-password/request', {
      email: email.trim().toLowerCase(),
    });
    return res.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Error al solicitar el código de recuperación.';
    throw new Error(errorMessage);
  }
}

export async function resetPasswordWithOTP(email: string, code: string, newPassword: string): Promise<any> {
  try {
    const res = await apiClient.post('/auth/recover-password/reset', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
      new_password: newPassword,
    });
    return res.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || error.message || 'Error al restablecer la contraseña.';
    throw new Error(errorMessage);
  }
}

