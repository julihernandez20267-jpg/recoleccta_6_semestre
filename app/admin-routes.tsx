import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { LatLng, MapPressEvent, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { getRoutes, createRoute, getRouteAssignments, assignRoute, getUsers } from '@/services/api';

export default function AdminRoutesScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [routeName, setRouteName] = useState('');
  const [routeZone, setRouteZone] = useState('');
  const [draftPoints, setDraftPoints] = useState<LatLng[]>([]);
  
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'create' | 'assign'>('create');
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setApiFailed(false);
    try {
      const [routesRes, usersRes, assignRes] = await Promise.all([
        getRoutes(),
        getUsers(),
        getRouteAssignments(),
      ]);

      if (routesRes.success && usersRes.success && assignRes.success) {
        // Parse routes
        const routesList = (routesRes.data?.routes || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          zone: r.zone,
          points: JSON.parse(r.points),
        }));
        setSavedRoutes(routesList);

        // Parse guardians
        const guardiansList = (usersRes.data?.users || []).filter((u: any) => u.role === 'guardian');
        setGuardians(guardiansList);

        // Parse assignments
        setAssignments(assignRes.data?.assignments || []);
        
        if (routesList.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routesList[0].id);
        }
      } else {
        throw new Error('No se pudo cargar la información del servidor.');
      }
    } catch (error) {
      setApiFailed(true);
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor para obtener rutas o guardianes.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  const routesWithAssignments = useMemo(() => {
    return savedRoutes.map((route) => {
      const assignment = assignments.find((a) => a.routeId === route.id);
      let assignedTo = undefined;
      if (assignment) {
        const guardian = guardians.find((g) => g.uid === assignment.guardianId);
        assignedTo = guardian ? (guardian.displayName || guardian.email) : `Guardián #${assignment.guardianId}`;
      }
      return {
        ...route,
        assignedTo,
      };
    });
  }, [savedRoutes, assignments, guardians]);

  const selectedRoute = useMemo(
    () => routesWithAssignments.find((item) => item.id === selectedRouteId) ?? null,
    [routesWithAssignments, selectedRouteId],
  );

  const handleMapPress = (event: MapPressEvent) => {
    if (activeSection !== 'create' || apiFailed) {
      return;
    }
    const coordinate = event.nativeEvent.coordinate;
    setDraftPoints((current) => [...current, coordinate]);
  };

  const handleSaveRoute = async () => {
    if (apiFailed) {
      Alert.alert('Error', 'Acción no disponible debido a una falla en la API.');
      return;
    }
    if (!routeName.trim() || !routeZone.trim() || draftPoints.length < 2) {
      Alert.alert('Faltan datos', 'Necesitas nombre, zona y al menos 2 puntos en el mapa.');
      return;
    }

    const routeId = `r-${Date.now()}`;
    const pointsStr = JSON.stringify(draftPoints);

    setLoading(true);
    try {
      const res = await createRoute(routeId, routeName.trim(), routeZone.trim(), pointsStr);
      if (res.success) {
        Alert.alert('Ruta creada', 'La ruta quedó guardada y lista para asignarse.');
        setRouteName('');
        setRouteZone('');
        setDraftPoints([]);
        await loadData();
        setSelectedRouteId(routeId);
        setActiveSection('assign');
      } else {
        throw new Error(res.message || 'Error al guardar la ruta.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la ruta en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRoute = async (guardianId: number, guardianName: string) => {
    if (apiFailed) {
      Alert.alert('Error', 'Acción no disponible debido a una falla en la API.');
      return;
    }
    if (!selectedRoute) {
      Alert.alert('Selecciona una ruta', 'Primero escoge una ruta guardada o crea una nueva.');
      return;
    }

    setLoading(true);
    try {
      const res = await assignRoute(guardianId, selectedRoute.id);
      if (res.success) {
        Alert.alert('Ruta asignada', `${selectedRoute.name} fue asignada a ${guardianName}.`);
        await loadData();
      } else {
        throw new Error(res.message || 'Error al asignar la ruta.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo asignar la ruta en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const mapPoints = activeSection === 'create' ? draftPoints : selectedRoute?.points ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Rutas</Text>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>ADMINISTRACIÓN</Text>
        <Text style={styles.title}>Crear y asignar rutas</Text>
        <Text style={styles.subtitle}>Toca el mapa para dibujar puntos y luego asigna la ruta a un guardián.</Text>

        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentButton, activeSection === 'create' && styles.segmentButtonActive]}
            onPress={() => setActiveSection('create')}
          >
            <Text style={[styles.segmentText, activeSection === 'create' && styles.segmentTextActive]}>Crear ruta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, activeSection === 'assign' && styles.segmentButtonActive]}
            onPress={() => setActiveSection('assign')}
          >
            <Text style={[styles.segmentText, activeSection === 'assign' && styles.segmentTextActive]}>Asignación</Text>
          </TouchableOpacity>
        </View>

        {loading && savedRoutes.length === 0 ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : apiFailed ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={32} color={Colors.error} />
            <Text style={styles.errorText}>No se pueden administrar rutas por una falla en la API.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeSection === 'create' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Diseña la ruta</Text>
                <Text style={styles.cardSubtitle}>Agrega puntos tocando el mapa. Luego guarda la ruta con nombre y zona.</Text>

                <TextInput
                  value={routeName}
                  onChangeText={setRouteName}
                  placeholder="Nombre de la ruta"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                />
                <TextInput
                  value={routeZone}
                  onChangeText={setRouteZone}
                  placeholder="Zona / barrio"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                />

                <View style={styles.mapCard}>
                  <MapView
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                      latitude: 4.6272,
                      longitude: -74.0732,
                      latitudeDelta: 0.03,
                      longitudeDelta: 0.03,
                    }}
                    onPress={handleMapPress}
                  >
                    {mapPoints.length > 1 ? <Polyline coordinates={mapPoints} strokeColor={Colors.primary} strokeWidth={4} /> : null}
                    {mapPoints.map((point: any, index: number) => (
                      <Marker
                        key={`${point.latitude}-${point.longitude}-${index}`}
                        coordinate={point}
                        pinColor={index === 0 ? Colors.error : Colors.primary}
                      />
                    ))}
                  </MapView>
                </View>

                <Text style={styles.helperText}>Puntos creados: {draftPoints.length}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.ghostButton} onPress={() => setDraftPoints([])}>
                    <Text style={styles.ghostButtonText}>Limpiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSaveRoute}>
                    <MaterialCommunityIcons name="content-save-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.primaryButtonText}>Crear ruta</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeSection === 'assign' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Asignar ruta</Text>
                <Text style={styles.cardSubtitle}>Selecciona una ruta creada y luego toca el guardián al que se la quieras dejar.</Text>

                {savedRoutes.length === 0 ? (
                  <Text style={{ color: Colors.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginVertical: 14 }}>
                    No hay rutas guardadas. Crea una primero.
                  </Text>
                ) : (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeChipsRow}>
                      {savedRoutes.map((route) => {
                        const isSelected = route.id === selectedRouteId;
                        return (
                          <TouchableOpacity
                            key={route.id}
                            style={[styles.routeChip, isSelected && styles.routeChipActive]}
                            onPress={() => setSelectedRouteId(route.id)}
                          >
                            <Text style={[styles.routeChipTitle, isSelected && styles.routeChipTitleActive]}>{route.name}</Text>
                            <Text style={[styles.routeChipSubtitle, isSelected && styles.routeChipSubtitleActive]} numberOfLines={1}>
                              {route.zone}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.assigneeBox}>
                      <Text style={styles.assigneeLabel}>Ruta seleccionada</Text>
                      <Text style={styles.assigneeTitle}>{selectedRoute ? selectedRoute.name : 'Ninguna'}</Text>
                      <Text style={styles.assigneeSub}>{selectedRoute ? selectedRoute.zone : 'Selecciona una ruta primero'}</Text>
                    </View>

                    {guardians.length === 0 ? (
                      <Text style={{ color: Colors.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginVertical: 14 }}>
                        No hay guardianes registrados para asignar.
                      </Text>
                    ) : (
                      guardians.map((guardian) => {
                        const guardianName = guardian.displayName || guardian.email.split('@')[0];
                        return (
                          <TouchableOpacity key={guardian.uid} style={styles.guardianAssignCard} onPress={() => handleAssignRoute(guardian.uid, guardianName)}>
                            <View>
                              <Text style={styles.guardianName}>{guardianName}</Text>
                              <Text style={styles.guardianEmail}>{guardian.email}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.onSurfaceVariant} />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.savedRoutesSection}>
              <Text style={styles.cardTitle}>Rutas creadas</Text>
              {routesWithAssignments.length === 0 ? (
                <Text style={{ color: Colors.onSurfaceVariant, fontSize: 12, marginTop: 8 }}>No hay rutas registradas.</Text>
              ) : (
                routesWithAssignments.map((route) => (
                  <View key={route.id} style={styles.savedRouteCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedRouteTitle}>{route.name}</Text>
                      <Text style={styles.savedRouteSub}>{route.zone}</Text>
                    </View>
                    <View style={styles.savedRouteMeta}>
                      <Text style={styles.savedRouteMetaText}>{route.points.length} puntos</Text>
                      <Text style={styles.savedRouteMetaText}>{route.assignedTo ? `Asignada a ${route.assignedTo}` : 'Sin asignar'}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin-panel')}>
          <MaterialCommunityIcons name="home" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin-guardians')}>
          <MaterialCommunityIcons name="shield-account-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Guardianes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/admin-routes' as never)}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color={Colors.onPrimary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Rutas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile-edit')}>
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  topTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope' },
  content: { padding: 18, paddingBottom: 120 },
  label: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope' },
  subtitle: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 8, marginBottom: 16, lineHeight: 18 },
  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  segmentButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { color: Colors.onSurfaceVariant, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: Colors.onPrimary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8e8e3',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope' },
  cardSubtitle: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 6, marginBottom: 14, lineHeight: 17 },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.onSurface,
    marginBottom: 12,
  },
  mapCard: { height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  map: { flex: 1 },
  helperText: { fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  ghostButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  ghostButtonText: { color: Colors.onSurfaceVariant, fontSize: 13, fontWeight: '800' },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: Colors.onPrimary, fontSize: 13, fontWeight: '800' },
  routeChipsRow: { gap: 10, paddingVertical: 4 },
  routeChip: {
    width: 180,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    padding: 12,
  },
  routeChipActive: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primary },
  routeChipTitle: { fontSize: 13, fontWeight: '800', color: Colors.onSurface },
  routeChipTitleActive: { color: Colors.onPrimaryFixed },
  routeChipSubtitle: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  routeChipSubtitleActive: { color: Colors.onPrimaryFixed },
  assigneeBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 12,
  },
  assigneeLabel: { fontSize: 10, fontWeight: '800', color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  assigneeTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurface, marginTop: 4, fontFamily: 'Manrope' },
  assigneeSub: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 4 },
  guardianAssignCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  guardianName: { fontSize: 14, fontWeight: '800', color: Colors.onSurface },
  guardianEmail: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  savedRoutesSection: { gap: 10 },
  savedRouteCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  savedRouteTitle: { fontSize: 14, fontWeight: '800', color: Colors.onSurface },
  savedRouteSub: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  savedRouteMeta: { alignItems: 'flex-end', gap: 4 },
  savedRouteMetaText: { fontSize: 11, color: Colors.onSurfaceVariant, textAlign: 'right' },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e3',
  },
  errorText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(250, 250, 245, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191, 202, 186, 0.2)',
    paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  navItemActive: { backgroundColor: Colors.primary, borderRadius: 16, marginHorizontal: 4 },
  navLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, marginTop: 4, letterSpacing: 0.3 },
  navLabelActive: { color: Colors.onPrimary },
});

