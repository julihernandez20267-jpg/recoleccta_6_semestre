import { completeGuardianRoute, getGuardianRoute, getReports, updateReportStatus } from '@/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
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

  const pendingReports = reports.filter((item) => item.status === 'pending' || item.status === 'pendiente');
  const inProgressReports = reports.filter((item) => item.status === 'in-progress' || item.status === 'en proceso');

  useEffect(() => {
    if (user) {
      if (user.role === 'guardian') {
        loadData();
      } else {
        setLoading(false);
        if (user.role === 'admin') {
          router.replace('/admin-panel');
        } else {
          router.replace('/(tabs)');
        }
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
      Alert.alert('Falla de Conexión', 'No se pudo conectar con el servidor.');
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
        Alert.alert('Éxito', `Reporte actualizado a ${newStatus}`);
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

  async function handleCompleteRoute() {
    if (!user?.uid || apiFailed || !activeRoute) return;
    setActionLoading(true);
    try {
      // Completar la ruta activa
      const res = await completeGuardianRoute(user.uid, activeRoute.routeId);
      if (res.success) {
        Alert.alert('Éxito', '¡Ruta completada con éxito!');
        setActiveWaypointIndex(0);
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

  const handleAdvanceWaypoint = () => {
    if (!activeRoute?.coordinates || activeRoute.coordinates.length === 0) return;
    setActiveWaypointIndex((prev) => (prev + 1) % activeRoute.coordinates.length);
  };

  const initialLat = activeRoute?.coordinates?.[0]?.latitude || 4.6272;
  const initialLng = activeRoute?.coordinates?.[0]?.longitude || -74.0732;

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
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: initialLat,
                longitude: initialLng,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              {assignedRoutes.map((assignment: any) => {
                const isRouteActive = assignment.status === 'in-progress';
                const color = isRouteActive ? '#2E7D32' : '#C62828'; // Verde activa, Rojo inactiva
                return (
                  <Fragment key={`route-poly-${assignment.routeId}`}>
                    {assignment.coordinates && assignment.coordinates.length > 0 && (
                      <Polyline
                        coordinates={assignment.coordinates}
                        strokeColor={color}
                        strokeWidth={isRouteActive ? 5 : 3}
                      />
                    )}

                    {assignment.coordinates && assignment.coordinates.map((coordinate: any, index: number) => {
                      const isSelectedWaypoint = isRouteActive && index === activeWaypointIndex;
                      return (
                        <Marker 
                          key={`route-pt-${assignment.routeId}-${index}`} 
                          coordinate={coordinate}
                          title={`${assignment.route.name} - Punto ${index + 1}`}
                        >
                          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 10, overflow: 'visible' }}>
                            <View style={{
                              backgroundColor: isRouteActive ? '#E8F5E9' : '#FFEBEE',
                              padding: isSelectedWaypoint ? 6 : 4,
                              borderRadius: 99,
                              borderWidth: 1.5,
                              borderColor: color,
                              transform: [{ scale: isSelectedWaypoint ? 1.4 : 1.0 }]
                            }}>
                              <MaterialCommunityIcons 
                                name="map-marker" 
                                size={isSelectedWaypoint ? 28 : 18} 
                                color={color} 
                              />
                            </View>
                          </View>
                        </Marker>
                      );
                    })}
                  </Fragment>
                );
              })}

              {reports
                .filter((item) => item.status !== 'completed' && item.status !== 'completado')
                .map((item) => (
                  <Marker
                    key={`report-${item.id}`}
                    coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                    pinColor={item.status === 'pending' || item.status === 'pendiente' ? '#b3261e' : '#e18d00'}
                    title={`Reporte #${item.id}`}
                    description={item.address}
                  />
                ))}
            </MapView>
          </View>

          <View style={styles.routeInfoCard}>
            {apiFailed ? (
              <View style={{ gap: 6 }}>
                <View style={[styles.routeBadge, { backgroundColor: '#fde8e8' }]}>
                  <Text style={[styles.routeBadgeText, { color: Colors.error }]}>FALLA DE API</Text>
                </View>
                <Text style={styles.routeTitle}>Servidor Desconectado</Text>
                <Text style={styles.routeSubtitle}>Las acciones de rutas y reportes se encuentran deshabilitadas.</Text>
                <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 8 }} onPress={loadData}>
                  <Text style={{ color: Colors.onPrimary, fontWeight: '700' }}>Reintentar Conexión</Text>
                </TouchableOpacity>
              </View>
            ) : assignedRoutes.length === 0 ? (
              <>
                <View style={styles.routeBadge}>
                  <Text style={styles.routeBadgeText}>SIN RUTAS ASIGNADAS</Text>
                </View>
                <Text style={styles.routeTitle}>Mapa de rutas</Text>
                <Text style={styles.routeSubtitle}>Aún no tienes rutas activas o pendientes asignadas por el admin.</Text>
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
                    ? `Zona activa: ${activeRoute.route.zone} (Verde). Rutas en espera en Rojo.` 
                    : "No hay ninguna ruta activa actualmente. Activa una ruta para iniciar."}
                </Text>

                {activeRoute && (
                  <View style={styles.waypointControlRow}>
                    <Text style={styles.waypointText}>
                      Punto actual: <Text style={{ fontWeight: '800', color: Colors.primary }}>{activeWaypointIndex + 1}</Text> / {activeRoute.coordinates.length}
                    </Text>
                    <TouchableOpacity style={styles.advanceButton} onPress={handleAdvanceWaypoint}>
                      <MaterialCommunityIcons name="arrow-right-bold-circle-outline" size={18} color={Colors.primary} />
                      <Text style={styles.advanceButtonText}>Avanzar Punto</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeRoute && (
                  <TouchableOpacity style={styles.completeButton} onPress={handleCompleteRoute} disabled={actionLoading}>
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.completeButtonText}>Finalizar Ruta Activa</Text>
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

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}> 
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/guardian-panel')}>
          <MaterialCommunityIcons name="home-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/guardian-map')}>
          <MaterialCommunityIcons name="map" size={20} color={Colors.onPrimary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/guardian-profile')}>
          <MaterialCommunityIcons name="account-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
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

