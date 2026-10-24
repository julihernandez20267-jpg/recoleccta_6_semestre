import { PriorityBadge, StatusChip } from '@/components/ui/StatusChip';
import { BottomNav } from '@/components/ui/BottomNav';
import { ConnectionError } from '@/components/ui/ConnectionError';
import { useAuth } from '@/context/AuthContext';
import { getContainerRequests, getGuardianRoute, getReports } from '@/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { homeRouteFor } from '../constants/Roles';
import { normalizeStatus, sortByPriority } from '../constants/Reports';

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días,';
  if (hour < 19) return 'Buenas tardes,';
  return 'Buenas noches,';
}

export default function GuardianPanelScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [assignedRoute, setAssignedRoute] = useState<any>(null);
  const [queuedRoutes, setQueuedRoutes] = useState(0);
  const [openContainers, setOpenContainers] = useState(0);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'guardian') {
        loadData();
      } else {
        setLoading(false);
        router.replace(homeRouteFor(user.role));
      }
    }
  }, [user]);

  async function loadData() {
    if (!user || user.role !== 'guardian') return;
    setLoading(true);
    setApiFailed(false);
    try {
      const [routeRes, reportsRes, containersRes] = await Promise.all([
        getGuardianRoute(user.uid),
        getReports(),
        getContainerRequests(),
      ]);
      setOpenContainers((containersRes.data?.requests || []).filter((r: any) => r.status !== 'delivered').length);

      setQueuedRoutes((routeRes.data?.assignments || []).filter((a: any) => a.status === 'pending').length);
      if (routeRes.success && routeRes.data) {
        const assignmentObj = routeRes.data.assignment;
        if (assignmentObj && assignmentObj.route) {
          const parsedPoints = typeof assignmentObj.route.points === 'string' 
            ? JSON.parse(assignmentObj.route.points) 
            : assignmentObj.route.points;
          setAssignedRoute({
            ...assignmentObj.route,
            points: parsedPoints,
            totalPoints: parsedPoints?.length || 0,
          });
        } else {
          setAssignedRoute(null);
        }
      } else {
        setAssignedRoute(null);
      }

      if (reportsRes.success && reportsRes.data?.reports) {
        setReports(reportsRes.data.reports);
      } else {
        throw new Error('Error al cargar los reportes.');
      }
    } catch (error) {
      setApiFailed(true);
      Alert.alert('Sin conexión', 'No pudimos conectarnos con el servidor. Intenta de nuevo en un momento.');
    } finally {
      setLoading(false);
    }
  }

  // Las solicitudes de comercios van primero.
  const visibleReports = sortByPriority(reports.filter((item) => normalizeStatus(item.status) !== 'completed')).slice(0, 4);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="leaf" size={24} color={Colors.primary} />
          <Text style={styles.brandText}>Recoleccta</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.avatarButton} onPress={() => router.push('/guardian-profile')}>
            <MaterialCommunityIcons name="account" size={18} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : apiFailed ? (
        <ConnectionError onRetry={() => loadData()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroHeader}>
            <Text style={styles.greeting}>{greetingForNow()}</Text>
            <Text style={styles.guardianName}>{user?.displayName || 'Guardián Verde'}</Text>
            <Text style={styles.helperText}>
              {assignedRoute
                ? `Ruta activa: ${assignedRoute.name} (${assignedRoute.zone}).`
                : 'Sin ruta asignada. Esperando asignación del administrador.'}
            </Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.statusChip}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{assignedRoute ? 'EN RUTA' : 'EN ESPERA'}</Text>
            </View>

            <Text style={styles.routeTitle}>
              {assignedRoute 
                ? `${assignedRoute.name} - ${assignedRoute.zone}` 
                : 'Sin ruta asignada'}
            </Text>

            <View style={styles.metricsRow}>
              <View>
                <Text style={styles.metricLabel}>Puntos de recolección</Text>
                <Text style={styles.metricValue}>{assignedRoute ? assignedRoute.totalPoints : '--'}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View>
                <Text style={styles.metricLabel}>Rutas en cola</Text>
                <Text style={styles.metricValue}>{queuedRoutes}</Text>
              </View>
            </View>

            {assignedRoute && (
              <TouchableOpacity style={styles.mapButton} onPress={() => router.push('/guardian-map')}>
                <MaterialCommunityIcons name="map-outline" size={18} color={Colors.primary} />
                <Text style={styles.mapButtonText}>Ver mapa de ruta</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.containersCard} onPress={() => router.push('/containers')} activeOpacity={0.9}>
            <MaterialCommunityIcons name="barrel-outline" size={26} color={Colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.containersTitle}>Bidones para aceite</Text>
              <Text style={styles.containersSub}>
                {openContainers === 0
                  ? 'No hay bidones pendientes por entregar.'
                  : `${openContainers} ${openContainers === 1 ? 'solicitud' : 'solicitudes'} de comercios por atender`}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Ruta asignada</Text>

          {!assignedRoute ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardText}>Aún no tienes una ruta asignada por el administrador.</Text>
            </View>
          ) : (
            <View style={styles.routeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeRowTitle}>{assignedRoute.name}</Text>
                <Text style={styles.routeRowSub}>{assignedRoute.zone}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: `${Colors.primaryFixedDim}40` }]}>
                <Text style={[styles.statusPillText, { color: Colors.primary }]}>
                  ASIGNADA
                </Text>
              </View>
            </View>
          )}

          <View style={styles.tabsRow}>
            <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
              <Text style={[styles.tabText, styles.tabTextActive]}>Reportes pendientes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/guardian-list')}>
              <Text style={styles.tabText}>Todos los reportes</Text>
            </TouchableOpacity>
          </View>

          {visibleReports.length === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.onSurfaceVariant, fontSize: 13, marginVertical: 10 }}>
              No hay reportes pendientes por ahora.
            </Text>
          ) : (
            visibleReports.map((item) => {
              const address = item.address || 'Reporte Sin Dirección';
              const type = item.type || 'General';
              const status = item.status || 'pendiente';
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reportCard}
                  onPress={() => router.push({ pathname: '/report-detail/[id]', params: { id: String(item.id) } })}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    {item.is_priority ? <PriorityBadge businessName={item.business_name} /> : null}
                    <Text style={styles.reportTitle} numberOfLines={1}>{address}</Text>
                    <Text style={styles.reportSub}>{type} · #{item.id}</Text>
                  </View>
                  <StatusChip status={status} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <BottomNav activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf5' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#fafaf5',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ebe5',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.6,
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf2ec',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 140,
    gap: 14,
  },
  heroHeader: {
    gap: 2,
  },
  greeting: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  guardianName: {
    fontSize: 33,
    fontWeight: '800',
    lineHeight: 38,
    color: '#182018',
    letterSpacing: -0.6,
  },
  helperText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#0b4d15',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 5,
    gap: 14,
  },
  heroGlow: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primaryFixed,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.onPrimary,
  },
  routeTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    color: Colors.onPrimary,
    letterSpacing: -0.6,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.76)',
  },
  metricValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  mapButton: {
    marginTop: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionTitle: {
    marginTop: 2,
    fontSize: 19,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#dce4d8',
  },
  infoCardText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  routeRow: {
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#dce4d8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  routeRowSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dce3d9',
    marginTop: 4,
  },
  tabButton: {
    paddingBottom: 10,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  containersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  containersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  containersSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  reportCard: {
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#dce4d8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  reportSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  reportStatus: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  bottomNav: {
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250,250,245,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e7ece4',
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  navItemActive: {
    backgroundColor: Colors.primary,
  },
  navLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '700' },
  navLabelActive: { color: Colors.onPrimary },
});
