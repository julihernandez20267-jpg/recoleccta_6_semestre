import apiClient from './apiClient';

// User & Role API
export async function getUsers() {
  const res = await apiClient.get('/admin/users');
  return res.data;
}

export async function updateUserRole(userId: number, role: string) {
  const res = await apiClient.post('/admin/users', { userId, role });
  return res.data;
}

export async function createGuardian(email: string, password: string, displayName: string) {
  const res = await apiClient.post('/admin/guardians', { email, password, displayName });
  return res.data;
}

// Routes API
export async function getRoutes() {
  const res = await apiClient.get('/routes');
  return res.data;
}

export async function createRoute(id: string, name: string, zone: string, points: string) {
  const res = await apiClient.post('/routes', { id, name, zone, points });
  return res.data;
}

export async function getRouteAssignments() {
  const res = await apiClient.get('/admin/routes');
  return res.data;
}

export async function assignRoute(guardianId: number, routeId: string) {
  const res = await apiClient.post('/admin/routes', { guardianId, routeId });
  return res.data;
}

export async function getGuardianRoute(guardianId: number) {
  const res = await apiClient.get(`/guardian/route?guardianId=${guardianId}`);
  return res.data;
}

// Reports API
export async function getReports() {
  const res = await apiClient.get('/reports');
  return res.data;
}

export async function createReport(data: {
  address: string;
  neighborhood?: string;
  type: string;
  latitude: number;
  longitude: number;
  observations?: string;
  reporter_name?: string;
  has_evidence?: boolean;
}) {
  const res = await apiClient.post('/reports', data);
  return res.data;
}

export async function updateReportStatus(reportId: number, status: string, guardianName?: string) {
  let apiStatus = status;
  if (status === 'en proceso') {
    apiStatus = 'in-progress';
  } else if (status === 'completado') {
    apiStatus = 'completed';
  } else if (status === 'pendiente') {
    apiStatus = 'pending';
  }
  const res = await apiClient.put(`/reports/${reportId}/status`, { status: apiStatus, guardian_name: guardianName });
  return res.data;
}

export async function completeGuardianRoute(guardianId: number, routeId?: string) {
  const url = routeId 
    ? `/guardian/route/complete?guardianId=${guardianId}&routeId=${routeId}`
    : `/guardian/route/complete?guardianId=${guardianId}`;
  const res = await apiClient.post(url);
  return res.data;
}

