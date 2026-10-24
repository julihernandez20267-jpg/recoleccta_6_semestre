import type { Href } from 'expo-router';
import type { UserRole } from '../types/auth';

// Cómo se muestra cada rol. En la base de datos siguen siendo 'user', 'guardian', 'admin' y 'business'.
export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Ciudadano',
  guardian: 'Guardián',
  admin: 'Administrador',
  business: 'Comercio',
};

// Versión corta para botones donde no cabe el nombre completo.
export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  user: 'Ciudadano',
  guardian: 'Guardián',
  admin: 'Admin',
  business: 'Comercio',
};

export function roleLabel(role?: string | null): string {
  return ROLE_LABELS[role as UserRole] ?? ROLE_LABELS.user;
}

// Pantalla de inicio de cada rol.
export function homeRouteFor(role?: string | null): Href {
  if (role === 'admin') return '/admin-panel';
  if (role === 'guardian') return '/guardian-panel';
  if (role === 'business') return '/business-panel';
  return '/(tabs)';
}

export const BUSINESS_TYPES = ['Restaurante', 'Taller mecánico', 'Gasolinera', 'Otro'];
