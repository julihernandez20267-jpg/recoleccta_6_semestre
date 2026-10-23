import { useSyncExternalStore } from 'react';

export type ReportStatus = 'completed' | 'in-progress' | 'pending';

export type ReportItem = {
  id: number;
  address: string;
  neighborhood: string;
  createdAt: string;
  dateLabel: string;
  submittedAt: string;
  status: ReportStatus;
  type: string;
  eta: string | null;
  coordinates: string;
  latitude: number;
  longitude: number;
  observations: string;
  reporterName: string;
  evidenceLabel: string;
  assignedGuardianName?: string;
};

const initialReports: ReportItem[] = [
  {
    id: 1,
    address: 'Calle 17 con Carrera 10',
    neighborhood: 'Centro, Girardot',
    createdAt: '2026-04-13T09:20:00-05:00',
    dateLabel: 'Hace 2 horas',
    submittedAt: '13 de abril de 2026, 09:20 a. m.',
    status: 'completed',
    type: 'Plastico y papel',
    eta: null,
    coordinates: '4.30362, -74.80151',
    latitude: 4.30362,
    longitude: -74.80151,
    observations: 'El contenedor estaba al maximo de capacidad y con bolsas alrededor del punto.',
    reporterName: 'Julia R.',
    evidenceLabel: '1 imagen adjunta',
  },
  {
    id: 2,
    address: 'Avenida Kennedy con Calle 20',
    neighborhood: 'Kennedy, Girardot',
    createdAt: '2026-04-12T07:05:00-05:00',
    dateLabel: 'Ayer',
    submittedAt: '12 de abril de 2026, 07:05 a. m.',
    status: 'in-progress',
    type: 'Vidrio y metal',
    latitude: 4.30094,
    longitude: -74.80483,
    eta: '30 min',
    coordinates: '4.30094, -74.80483',
    observations: 'La ruta fue asignada y el guardian ya se dirige al punto.',
    reporterName: 'Julia R.',
    evidenceLabel: 'Sin imagen confirmada',
    assignedGuardianName: 'Guardian Verde',
  },
  {
    id: 3,
    address: 'Carrera 7 con Calle 14',
    neighborhood: 'Alto de la Cruz, Girardot',
    createdAt: '2026-04-08T05:40:00-05:00',
    dateLabel: 'Hace 5 dias',
    submittedAt: '8 de abril de 2026, 05:40 a. m.',
    status: 'pending',
    type: 'Organico',
    latitude: 4.31115,
    longitude: -74.81311,
    eta: '2 horas',
    coordinates: '4.31115, -74.81311',
    observations: 'Se reporta mal olor y residuos fuera del compartimiento principal.',
    reporterName: 'Julia R.',
    evidenceLabel: 'Pendiente por adjuntar',
  },
];

let reportsStore: ReportItem[] = [...initialReports];
const reportListeners = new Set<() => void>();

function emitReportChange() {
  reportListeners.forEach((listener) => listener());
}

function subscribeReports(listener: () => void) {
  reportListeners.add(listener);
  return () => {
    reportListeners.delete(listener);
  };
}

export function useReports() {
  return useSyncExternalStore(subscribeReports, () => reportsStore, () => reportsStore);
}

export function getReports() {
  return reportsStore;
}

type CreateReportInput = {
  address: string;
  neighborhood: string;
  type: string;
  observations: string;
  latitude: number;
  longitude: number;
  reporterName: string;
  hasEvidence: boolean;
};

function formatDateLabel(createdAtIso: string) {
  const createdAt = new Date(createdAtIso);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();

  if (diffMs < 60 * 60 * 1000) {
    return 'Hace unos minutos';
  }

  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)));
    return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
  }

  const days = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  return `Hace ${days} dia${days === 1 ? '' : 's'}`;
}

function formatSubmittedAt(createdAtIso: string) {
  const createdAt = new Date(createdAtIso);
  return createdAt.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function addReport(input: CreateReportInput): ReportItem {
  const nextId = reportsStore.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const createdAt = new Date().toISOString();

  const nextReport: ReportItem = {
    id: nextId,
    address: input.address,
    neighborhood: input.neighborhood,
    createdAt,
    dateLabel: formatDateLabel(createdAt),
    submittedAt: formatSubmittedAt(createdAt),
    status: 'pending',
    type: input.type,
    eta: 'Pendiente',
    coordinates: `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`,
    latitude: input.latitude,
    longitude: input.longitude,
    observations: input.observations,
    reporterName: input.reporterName,
    evidenceLabel: input.hasEvidence ? '1 imagen adjunta' : 'Sin imagen adjunta',
  };

  reportsStore = [nextReport, ...reportsStore];
  emitReportChange();
  return nextReport;
}

export function takeReport(reportId: number, guardianName?: string) {
  reportsStore = reportsStore.map((report) => {
    if (report.id !== reportId) {
      return report;
    }

    if (report.status === 'completed') {
      return report;
    }

    return {
      ...report,
      status: 'in-progress',
      eta: report.eta && report.eta !== 'Pendiente' ? report.eta : '30 min',
      assignedGuardianName: guardianName,
    };
  });

  emitReportChange();
}

export function completeReport(reportId: number) {
  reportsStore = reportsStore.map((report) => {
    if (report.id !== reportId) {
      return report;
    }

    return {
      ...report,
      status: 'completed',
      eta: null,
    };
  });

  emitReportChange();
}

export function updateReportStatus(reportId: number, status: ReportStatus) {
  if (status === 'in-progress') {
    takeReport(reportId);
    return;
  }

  if (status === 'completed') {
    completeReport(reportId);
    return;
  }

  reportsStore = reportsStore.map((report) => {
    if (report.id !== reportId) {
      return report;
    }

    return {
      ...report,
      status: 'pending',
      eta: 'Pendiente',
      assignedGuardianName: undefined,
    };
  });

  emitReportChange();
}

export function getReportById(id: number) {
  return reportsStore.find((report) => report.id === id);
}

export function getStatusLabel(status: ReportStatus) {
  if (status === 'completed') {
    return 'Atendido';
  }

  if (status === 'in-progress') {
    return 'En Proceso';
  }

  return 'Pendiente';
}
