import { BottomNav } from '@/components/ui/BottomNav';
import { ConnectionError } from '@/components/ui/ConnectionError';
import { completeGuardianRoute, getDrivingRoute, getGuardianRoute, getReports, updateReportStatus } from '@/services/api';
import { getCurrentCoords, locationErrorMessage } from '@/services/location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppMap } from '@/components/maps/AppMap';
import { regionFor } from '@/components/maps/region';
import type { LatLng, MapLine, MapMarker } from '@/components/maps/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { homeRouteFor } from '../constants/Roles';
import { DEFAULT_REGION } from '../constants/Map';
import { normalizeStatus, sortByPriority, STATUS_META } from '../constants/Reports';
import { useAuth } from '../context/AuthContext';

export default function GuardianMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [assignedRoutes, setAssignedRoutes] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number>(0);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // Ubicación del guardián y camino en carro hasta el punto actual de su ruta.
  const [myPosition, setMyPosition] = useState<LatLng | null>(null);
  const [approach, setApproach] = useState<{ points: LatLng[]; distanceKm: number; minutes: number } | null>(null);
  const [approachState, setApproachState] = useState<'idle' | 'locating' | 'done'>('idle');
  const [approachMessage, setApproachMessage] = useState('');

  const pendingReports = sortByPriority(reports.filter((item) => normalizeStatus(item.status) === 'pending'));
  const inProgressReports = sortByPriority(reports.filter((item) => normalizeStatus(item.status) === 'in-progress'));

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
      const [routeRes, reportsRes] = await Promise.all([
        getGuardianRoute(user.uid),
        getReports(),
      ]);

      if (routeRes.success && routeRes.data?.assignments) {
        const rawAssignments = routeRes.data.assignments;
        const parsedAssignments = rawAssignments.map((a: any) => {
          const parsedPoints = typeof a.route.points === 'string'
            ? JSON.parse(a.route.points)
            : a.route.points;
          return {
            ...a,
            coordinates: parsedPoints || [],
          };
        });
        setAssignedRoutes(parsedAssignments);
        
        // Encontrar ruta activa (in-progress)
        const active = parsedAssignments.find((a: any) => a.status === 'in-progress');
        setActiveRoute(active || null);
        
        // Reset active waypoint if route changed
        setActiveWaypointIndex(0);
      } else {
        setAssignedRoutes([]);
        setActiveRoute(null);
      }

      if (reportsRes.success && reportsRes.data?.reports) {
        setReports(reportsRes.data.reports);
      } else {
        throw new Error('Error al obtener reportes.');
      }
    } catch (e) {
      setApiFailed(true);
      Alert.alert('Sin conexión', 'No pudimos conectarnos con el servidor. Intenta de nuevo en un momento.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateReport(reportId: number, newStatus: string) {
    if (apiFailed) return;
    setActionLoading(true);
    try {
      const res = await updateReportStatus(reportId, newStatus, user?.displayName || 'Guardián');
      if (res.success) {
        Alert.alert('Reporte actualizado', `El reporte #${reportId} quedó "${STATUS_META[normalizeStatus(newStatus)].label}".`);
        loadData();
      } else {
        throw new Error(res.message || 'Error al actualizar reporte.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el reporte.');
    } finally {
      setActionLoading(false);
    }
  }

  function confirmCompleteRoute() {
    if (!activeRoute) return;
    Alert.alert(
      'Finalizar ruta',
      `¿Terminaste la ruta "${activeRoute.route.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, finalizar', onPress: () => void handleCompleteRoute() },
      ],
    );
  }

  async function handleCompleteRoute() {
    if (!user?.uid || apiFailed || !activeRoute) return;
    setActionLoading(true);
    try {
      // Completar la ruta activa
      const res = await completeGuardianRoute(user.uid, activeRoute.routeId);
      if (res.success) {
        Alert.alert('¡Ruta completada!', 'Buen trabajo. Si tienes otra ruta en cola, ya quedó activa.');
        setActiveWaypointIndex(0);
        setApproach(null);
        setApproachState('idle');
        await loadData();
      } else {
        throw new Error(res.message || 'Error al completar la ruta.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo completar la ruta.');
    } finally {
      setActionLoading(false);
    }
  }

  const targetPoint: LatLng | null = activeRoute?.coordinates?.[activeWaypointIndex] ?? null;

  async function traceApproach(from: LatLng | null, to: LatLng | null) {
    if (!from || !to) return;
    try {
      const res = await getDrivingRoute(from, to);
      if (res.data) {
        setApproach({
          points: res.data.points,
          distanceKm: res.data.distance_m / 1000,
          minutes: Math.max(1, Math.round(res.data.duration_s / 60)),
        });
        setApproachMessage('');
      }
    } catch {
      setApproach(null);
      setApproachMessage('No pudimos calcular el camino ahora. Puedes usar Google Maps para llegar.');
    }
  }

  // Pide la ubicación del guardián y traza el camino hasta el punto actual.
  async function locateAndTrace(to: LatLng | null) {
    setApproachState('locating');
    const position = await getCurrentCoords();
    if (position.ok) {
      setMyPosition(position.coords);
      await traceApproach(position.coords, to);
    } else {
      setApproach(null);
      setApproachMessage(locationErrorMessage(position.reason, 'usa el botón de Google Maps para llegar'));
    }
    setApproachState('done');
  }

  // Apenas hay una ruta activa, se ubica al guardián y se traza el camino al primer punto.
  useEffect(() => {
    if (targetPoint && approachState === 'idle') locateAndTrace(targetPoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute?.routeId, approachState]);

  function openNavigation() {
    if (!targetPoint) return;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${targetPoint.latitude},${targetPoint.longitude}&travelmode=driving`,
    );
  }

  const handleAdvanceWaypoint = () => {
    if (!activeRoute?.coordinates || activeRoute.coordinates.length === 0) return;
    const next = (activeWaypointIndex + 1) % activeRoute.coordinates.length;
    setActiveWaypointIndex(next);
    // El camino se recalcula hacia el nuevo punto desde la última ubicación conocida.
    traceApproach(myPosition, activeRoute.coordinates[next]);
  };

  // Rutas (verde la activa, rojo las que están en cola) y reportes abiertos para el mapa.
  const mapLines: MapLine[] = [
    ...(approach ? [{ id: 'approach', coordinates: approach.points, color: '#1e63d6', width: 4 }] : []),
    ...assignedRoutes.map((assignment: any) => ({
      id: `route-${assignment.routeId}`,
      coordinates: assignment.coordinates || [],
      color: assignment.status === 'in-progress' ? '#2E7D32' : '#C62828',
      width: assignment.status === 'in-progress' ? 5 : 3,
    })),
  ];
  const mapMarkers: MapMarker[] = [
    ...(myPosition ? [{ id: 'me', coordinate: myPosition, color: '#1e63d6', title: 'Tú estás aquí' }] : []),
    ...assignedRoutes.flatMap((assignment: any) =>
      (assignment.coordinates || []).map((coordinate: any, index: number) => ({
        id: `route-pt-${assignment.routeId}-${index}`,
        coordinate,
        kind: 'waypoint' as const,
        color: assignment.status === 'in-progress' ? '#2E7D32' : '#C62828',
        active: assignment.status === 'in-progress' && index === activeWaypointIndex,
        title: `${assignment.route.name} - Punto ${index + 1}`,
      })),
    ),
    ...reports
      .filter((item) => normalizeStatus(item.status) !== 'completed')
      .map((item) => ({
        id: `report-${item.id}`,
        coordinate: { latitude: item.latitude, longitude: item.longitude },
        color: item.is_priority ? '#8e24aa' : normalizeStatus(item.status) === 'pending' ? '#b3261e' : '#e18d00',
        title: item.is_priority ? `Comercio: ${item.business_name}` : `Reporte #${item.id}`,
        description: item.address,
      })),
  ];

  const initialLat = activeRoute?.coordinates?.[0]?.latitude || DEFAULT_REGION.latitude;
  const initialLng = activeRoute?.coordinates?.[0]?.longitude || DEFAULT_REGION.longitude;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="leaf" size={22} color={Colors.primary} />
          <Text style={styles.brandText}>Recoleccta</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/guardian-panel')}>
          <MaterialCommunityIcons name="home-outline" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.mapCard}>
            <AppMap
              // Cuando aparece la ubicación del guardián, el mapa se reencuadra para mostrarlo junto a la ruta.
              key={myPosition ? 'with-me' : 'route-only'}
              style={styles.map}
              initialRegion={
                myPosition && activeRoute?.coordinates?.length
                  ? regionFor([myPosition, ...activeRoute.coordinates])
                  : {
                      latitude: initialLat,
                      longitude: initialLng,
                      latitudeDelta: 0.03,
                      longitudeDelta: 0.03,
                    }
              }
              lines={mapLines}
              markers={mapMarkers}
            />
          </View>

          <View style={styles.routeInfoCard}>
            {apiFailed ? (
              <ConnectionError
                compact
                message="Las acciones de rutas y reportes se activarán cuando vuelva la conexión."
                onRetry={() => loadData()}
              />
            ) : assignedRoutes.length === 0 ? (
              <>
                <View style={styles.routeBadge}>
                  <Text style={styles.routeBadgeText}>SIN RUTAS ASIGNADAS</Text>
                </View>
                <Text style={styles.routeTitle}>Mapa de rutas</Text>
                <Text style={styles.routeSubtitle}>Aún no tienes rutas asignadas por el administrador.</Text>
              </>
            ) : (
              <>
                <View style={styles.routeBadge}>
                  <Text style={styles.routeBadgeText}>RUTAS ASIGNADAS ({assignedRoutes.length})</Text>
                </View>
                <Text style={styles.routeTitle}>
                  {activeRoute ? activeRoute.route.name : "Sin ruta activa en curso"}
                </Text>
                <Text style={styles.routeSubtitle}>
                  {activeRoute 
                    ? `Zona: ${activeRoute.route.zone}. La ruta activa se ve en verde y las que están en cola, en rojo.` 
                    : "No hay ninguna ruta activa actualmente. Activa una ruta para iniciar."}
                </Text>

                {activeRoute && (
                  <View style={styles.waypointControlRow}>
                    <Text style={styles.waypointText}>
                      Punto actual: <Text style={{ fontWeight: '800', color: Colors.primary }}>{activeWaypointIndex + 1}</Text> / {activeRoute.coordinates.length}
                    </Text>
                    <TouchableOpacity style={styles.advanceButton} onPress={handleAdvanceWaypoint}>
                      <MaterialCommunityIcons name="arrow-right-bold-circle-outline" size={18} color={Colors.primary} />
                      <Text style={styles.advanceButtonText}>Siguiente punto</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeRoute && (
                  <View style={styles.approachBox}>
                    {approachState === 'locating' ? (
                      <View style={styles.approachRow}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.approachMuted}>Buscando tu ubicación...</Text>
                      </View>
                    ) : approach ? (
                      <View style={styles.approachRow}>
                        <MaterialCommunityIcons name="car-outline" size={20} color="#1e63d6" />
                        <Text style={styles.approachText}>
                          Al punto {activeWaypointIndex + 1}: {approach.distanceKm.toFixed(1).replace('.', ',')} km · {approach.minutes} min
                        </Text>
                      </View>
                    ) : null}
                    {approachMessage ? <Text style={styles.approachMuted}>{approachMessage}</Text> : null}
                    {myPosition ? <Text style={styles.approachMuted}>Azul: tú y el camino hasta el punto.</Text> : null}
                    <View style={styles.approachActions}>
                      <TouchableOpacity style={styles.navButton} onPress={openNavigation} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="navigation-variant-outline" size={16} color={Colors.onPrimary} />
                        <Text style={styles.navButtonText}>Navegar con Google Maps</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => locateAndTrace(targetPoint)}
                        disabled={approachState === 'locating'}
                      >
                        <MaterialCommunityIcons name="crosshairs-gps" size={16} color={Colors.primary} />
                        <Text style={styles.refreshButtonText}>Mi ubicación</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {activeRoute && (
                  <TouchableOpacity style={styles.completeButton} onPress={confirmCompleteRoute} disabled={actionLoading}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.completeButtonText}>Finalizar ruta activa</Text>
                  </TouchableOpacity>
                )}

                {pendingReports.length > 0 && (
                  <TouchableOpacity
                    style={styles.takeReportButton}
                    onPress={() => handleUpdateReport(pendingReports[0].id, 'en proceso')}
                    disabled={actionLoading}
                  >
                    <MaterialCommunityIcons name="map-marker-plus-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.takeReportText}>{actionLoading ? "Procesando..." : `Tomar reporte pendiente (#${pendingReports[0].id})`}</Text>
                  </TouchableOpacity>
                )}

                {inProgressReports.length > 0 && (
                  <TouchableOpacity
                    style={styles.finishReportButton}
                    onPress={() => handleUpdateReport(inProgressReports[0].id, 'completado')}
                    disabled={actionLoading}
                  >
                    <MaterialCommunityIcons name="check-bold" size={18} color={Colors.onPrimary} />
                    <Text style={styles.finishReportText}>{actionLoading ? "Procesando..." : `Completar reporte en proceso (#${inProgressReports[0].id})`}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}

      <BottomNav activeTab="map" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf5' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.6,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 130,
    gap: 14,
  },
  mapCard: {
    height: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#dde5db',
  },
  map: {
    flex: 1,
  },
  routeInfoCard: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#dce4d8',
    padding: 14,
    gap: 8,
  },
  routeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFixed,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#1b5b1f',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  routeSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  approachBox: {
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  approachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approachText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  approachMuted: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },
  approachActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  navButtonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  waypointControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f0',
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
  },
  waypointText: {
    fontSize: 13,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  advanceButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  completeButton: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  takeReportButton: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#b3261e',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  takeReportText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  finishReportButton: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1f6f3a',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  finishReportText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
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
  navLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
  },
  navLabelActive: {
    color: Colors.onPrimary,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3ee',
  },
});

