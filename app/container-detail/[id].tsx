import { AppMap } from '@/components/maps/AppMap';
import type { LatLng, MapMarker, MapRegion } from '@/components/maps/types';
import { ConnectionError } from '@/components/ui/ConnectionError';
import { ContainerStatusChip } from '@/components/ui/StatusChip';
import { useAuth } from '@/context/AuthContext';
import { getContainerRequest, getDrivingRoute, updateContainerStatus } from '@/services/api';
import { getCurrentCoords, locationErrorMessage } from '@/services/location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { ComponentProps, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { ContainerStatus, formatDateTime, OIL_LABELS } from '../../constants/Reports';
import { homeRouteFor } from '../../constants/Roles';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type RouteInfo = { points: LatLng[]; distanceKm: number; minutes: number };

const NEXT_STEP: Partial<Record<ContainerStatus, { status: ContainerStatus; label: string; icon: IconName }>> = {
  pending: { status: 'in-progress', label: 'Marcar en camino', icon: 'truck-delivery-outline' },
  'in-progress': { status: 'delivered', label: 'Marcar entregado', icon: 'check-bold' },
};

// Encuadre del mapa para que se vean todos los puntos (la ruta, el admin y el comercio).
function regionFor(points: LatLng[]): MapRegion {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: span * 1.4 + 0.004,
    longitudeDelta: span * 1.4 + 0.004,
  };
}

export default function ContainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [myPosition, setMyPosition] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeState, setRouteState] = useState<'idle' | 'locating' | 'done'>('idle');
  const [routeMessage, setRouteMessage] = useState('');

  // Las solicitudes de bidón las atiende solo el administrador.
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace(homeRouteFor(user.role));
  }, [user, router]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await getContainerRequest(Number(id));
      setRequest(res.data?.request ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const destination: LatLng | null =
    request?.latitude != null && request?.longitude != null
      ? { latitude: request.latitude, longitude: request.longitude }
      : null;

  // Pide la ubicación del admin y calcula la ruta en carro hasta el punto de entrega.
  const traceRoute = useCallback(async () => {
    if (!destination) return;
    setRouteState('locating');
    setRouteMessage('');
    const position = await getCurrentCoords();
    if (!position.ok) {
      setRouteMessage(locationErrorMessage(position.reason, 'usa el botón de Google Maps para llegar'));
      setRouteState('done');
      return;
    }
    setMyPosition(position.coords);
    try {
      const res = await getDrivingRoute(position.coords, destination);
      if (res.data) {
        setRoute({
          points: res.data.points,
          distanceKm: res.data.distance_m / 1000,
          minutes: Math.max(1, Math.round(res.data.duration_s / 60)),
        });
      }
    } catch {
      setRouteMessage('No pudimos calcular la ruta ahora. Puedes abrir la navegación en Google Maps.');
    }
    setRouteState('done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.latitude, destination?.longitude]);

  // Apenas se abre una solicitud con punto en el mapa, se traza la ruta.
  useEffect(() => {
    if (destination && routeState === 'idle') traceRoute();
  }, [destination, routeState, traceRoute]);

  function openNavigation() {
    const target = destination
      ? `${destination.latitude},${destination.longitude}`
      : encodeURIComponent(request?.address ?? '');
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${target}&travelmode=driving`);
  }

  async function advance() {
    const step = NEXT_STEP[request?.status as ContainerStatus];
    if (!step) return;
    setUpdating(true);
    try {
      const res = await updateContainerStatus(request.id, step.status);
      setRequest(res.data?.request ?? request);
    } catch (error: any) {
      Alert.alert('No se pudo actualizar', error.response?.data?.detail || 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setUpdating(false);
    }
  }

  const header = (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Solicitud de bidón{request ? ` #${request.id}` : ''}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {header}
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (failed || !request) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {header}
        {failed ? (
          <ConnectionError onRetry={() => load()} />
        ) : (
          <Text style={styles.emptyText}>No encontramos esta solicitud.</Text>
        )}
      </View>
    );
  }

  const step = NEXT_STEP[request.status as ContainerStatus];
  const markers: MapMarker[] = [];
  if (destination) {
    markers.push({ id: 'destination', coordinate: destination, color: Colors.error, title: request.business_name || 'Punto de entrega' });
  }
  if (myPosition) {
    markers.push({ id: 'me', coordinate: myPosition, color: '#1e63d6', title: 'Tú estás aquí' });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Comercio que pidió el bidón */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>COMERCIO</Text>
              <Text style={styles.businessName}>{request.business_name || 'Comercio'}</Text>
              {request.business_type ? <Text style={styles.muted}>{request.business_type}</Text> : null}
            </View>
            <ContainerStatusChip status={request.status} />
          </View>
          {request.contact_name ? (
            <InfoRow icon="account-outline" label="Contacto" value={request.contact_name} />
          ) : null}
          {request.business_phone ? (
            <InfoRow
              icon="phone-outline"
              label="Teléfono"
              value={request.business_phone}
              actionLabel="Llamar"
              onPress={() => Linking.openURL(`tel:${String(request.business_phone).replace(/\s+/g, '')}`)}
            />
          ) : null}
          {request.contact_email ? (
            <InfoRow
              icon="email-outline"
              label="Correo"
              value={request.contact_email}
              actionLabel="Escribir"
              onPress={() => Linking.openURL(`mailto:${request.contact_email}?subject=Tu%20solicitud%20de%20bid%C3%B3n`)}
            />
          ) : null}
        </View>

        {/* Pedido */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PEDIDO</Text>
          <InfoRow
            icon="barrel-outline"
            label="Bidones"
            value={`${request.quantity} ${request.quantity === 1 ? 'bidón' : 'bidones'} para ${(OIL_LABELS[request.oil_type] ?? 'aceite').toLowerCase()}`}
          />
          <InfoRow icon="calendar-outline" label="Solicitado" value={formatDateTime(request.created_at)} />
          {request.notes ? <InfoRow icon="note-text-outline" label="Indicaciones" value={request.notes} /> : null}
          {request.handled_by_name ? (
            <InfoRow icon="account-check-outline" label="Atendido por" value={request.handled_by_name} />
          ) : null}
        </View>

        {/* Entrega y ruta */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ENTREGA</Text>
          <InfoRow icon="map-marker-outline" label="Dirección" value={request.address} />

          {destination ? (
            <>
              {routeState === 'locating' ? (
                <View style={styles.routeLoading}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.muted}>Buscando tu ubicación y calculando la ruta...</Text>
                </View>
              ) : (
                <>
                  {route ? (
                    <View style={styles.routeSummary}>
                      <MaterialCommunityIcons name="car-outline" size={20} color={Colors.primary} />
                      <Text style={styles.routeSummaryText}>
                        {route.distanceKm.toFixed(1).replace('.', ',')} km · {route.minutes} min en carro
                      </Text>
                    </View>
                  ) : null}
                  {routeMessage ? <Text style={styles.routeMessage}>{routeMessage}</Text> : null}
                  <View style={styles.mapFrame}>
                    <AppMap
                      initialRegion={regionFor([destination, ...(myPosition ? [myPosition] : []), ...(route?.points ?? [])])}
                      markers={markers}
                      lines={route ? [{ id: 'route', coordinates: route.points, color: '#1e63d6', width: 5 }] : []}
                    />
                  </View>
                  {myPosition ? (
                    <Text style={styles.legend}>Azul: tú · Rojo: el comercio</Text>
                  ) : (
                    <TouchableOpacity style={styles.linkButton} onPress={traceRoute}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={18} color={Colors.primary} />
                      <Text style={styles.linkButtonText}>Intentar de nuevo con mi ubicación</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          ) : (
            <Text style={styles.routeMessage}>
              Esta solicitud no tiene un punto en el mapa (se pidió sin usar la ubicación). Usa Google Maps con la dirección
              escrita.
            </Text>
          )}

          <TouchableOpacity style={styles.navButton} onPress={openNavigation} activeOpacity={0.85}>
            <MaterialCommunityIcons name="navigation-variant-outline" size={18} color={Colors.onPrimary} />
            <Text style={styles.navButtonText}>Abrir navegación en Google Maps</Text>
          </TouchableOpacity>
        </View>

        {step ? (
          <TouchableOpacity style={styles.primaryButton} onPress={advance} disabled={updating} activeOpacity={0.85}>
            {updating ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <MaterialCommunityIcons name={step.icon} size={18} color={Colors.onPrimary} />
            )}
            <Text style={styles.primaryButtonText}>{step.label}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  actionLabel,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={Colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {actionLabel ? <Text style={styles.infoAction}>{actionLabel}</Text> : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 48,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.onSurfaceVariant,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onSurface,
    marginTop: 2,
  },
  muted: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.onSurface,
  },
  infoAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  routeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 10,
  },
  routeSummaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  routeMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
  },
  mapFrame: {
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  legend: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  navButtonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: Colors.onSurfaceVariant,
  },
});
