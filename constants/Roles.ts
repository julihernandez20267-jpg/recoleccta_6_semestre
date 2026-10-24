import type { UserRole } from '../types/auth';

// Cómo se muestra cada rol. En la base de datos siguen siendo 'user', 'guardian' y 'admin'.
export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Ciudadano',
  guardian: 'Guardián',
  admin: 'Administrador',
};

// Versión corta para botones donde no cabe el nombre completo.
export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  user: 'Ciudadano',
  guardian: 'Guardián',
  admin: 'Admin',
};

export function roleLabel(role?: string | null): string {
  return ROLE_LABELS[role as UserRole] ?? ROLE_LABELS.user;
}
