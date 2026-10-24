import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type ReportStatus = 'pending' | 'in-progress' | 'completed';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Nombre, colores e ícono de cada estado: una sola fuente para todas las pantallas.
export const STATUS_META: Record<ReportStatus, { label: string; bg: string; text: string; icon: IconName }> = {
  pending: { label: 'Pendiente', bg: '#fff2c8', text: '#7a5d00', icon: 'clock-outline' },
  'in-progress': { label: 'En proceso', bg: '#d2e9f4', text: '#163845', icon: 'progress-clock' },
  completed: { label: 'Atendido', bg: '#d8f3dc', text: '#1f6f3a', icon: 'check-decagram' },
};

// El backend responde en inglés, pero algunas pantallas antiguas usaban los nombres en español.
export function normalizeStatus(status?: string | null): ReportStatus {
  const value = (status || '').toLowerCase();
  if (value === 'completed' || value === 'completado' || value === 'atendido') return 'completed';
  if (value === 'in-progress' || value === 'en proceso') return 'in-progress';
  return 'pending';
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} día${days === 1 ? '' : 's'}`;
  return formatDateTime(iso);
}
