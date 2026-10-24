import { BottomNav } from '@/components/ui/BottomNav';
import { ConnectionError } from '@/components/ui/ConnectionError';
import { ContainerStatusChip } from '@/components/ui/StatusChip';
import { useAuth } from '@/context/AuthContext';
import { getContainerRequests, updateContainerStatus } from '@/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { CONTAINER_STATUS_META, ContainerStatus, formatRelative, OIL_LABELS } from '../constants/Reports';
import { homeRouteFor } from '../constants/Roles';

type FilterKey = 'open' | ContainerStatus | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'open', label: 'Por atender' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'all', label: 'Todos' },
];

const NEXT_STEP: Partial<Record<ContainerStatus, { status: ContainerStatus; label: string; icon: 'truck-delivery-outline' | 'check-bold' }>> = {
  pending: { status: 'in-progress', label: 'Marcar en camino', icon: 'truck-delivery-outline' },
  'in-progress': { status: 'delivered', label: 'Marcar entregado', icon: 'check-bold' },
};

export default function ContainersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterKey>('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Las solicitudes de bidón las atiende solo el administrador.
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace(homeRouteFor(user.role));
  }, [user, router]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await getContainerRequests();
      setRequests(res.data?.requests || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(() => {
    if (filter === 'all') return requests;
    if (filter === 'open') return requests.filter((r) => r.status !== 'delivered');
    return requests.filter((r) => r.status === filter);
  }, [filter, requests]);

  const openCount = requests.filter((r) => r.status !== 'delivered').length;

  async function advance(request: any) {
    const step = NEXT_STEP[request.status as ContainerStatus];
    if (!step) return;
    setUpdatingId(request.id);
    try {
      await updateContainerStatus(request.id, step.status);
      await load();
    } catch (error: any) {
      Alert.alert('No se pudo actualizar', error.response?.data?.detail || 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Bidones para aceite</Text>
          <Text style={styles.headerSubtitle}>
            {openCount === 1 ? '1 solicitud por atender' : `${openCount} solicitudes por atender`}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = item.key === filter;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => setFilter(item.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : failed ? (
        <ConnectionError onRetry={() => load()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {visible.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="barrel-outline" size={44} color={Colors.outline} />
              <Text style={styles.emptyText}>
                {filter === 'open' ? 'No hay bidones pendientes por entregar.' : 'No hay solicitudes en esta lista.'}
              </Text>
            </View>
          ) : (
            visible.map((request) => {
              const step = NEXT_STEP[request.status as ContainerStatus];
              return (
                <View key={request.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.businessName}>{request.business_name || 'Comercio'}</Text>
                      <Text style={styles.meta}>
                        {request.business_type ? `${request.business_type} · ` : ''}
                        {formatRelative(request.created_at)}
                      </Text>
                    </View>
                    <ContainerStatusChip status={request.status} />
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="barrel-outline" size={16} color={Colors.primary} />
                    <Text style={styles.infoText}>
                      {request.quantity} {request.quantity === 1 ? 'bidón' : 'bidones'} para {(OIL_LABELS[request.oil_type] ?? 'aceite').toLowerCase()}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={Colors.primary} />
                    <Text style={styles.infoText}>{request.address}</Text>
                  </View>
                  {request.notes ? (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="note-text-outline" size={16} color={Colors.primary} />
                      <Text style={styles.infoText}>{request.notes}</Text>
                    </View>
                  ) : null}
                  {request.handled_by_name ? (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="account-hard-hat-outline" size={16} color={Colors.primary} />
                      <Text style={styles.infoText}>
                        {CONTAINER_STATUS_META[request.status as ContainerStatus]?.label ?? 'Atendido'} por {request.handled_by_name}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.ghostButton}
                      onPress={() => router.push({ pathname: '/container-detail/[id]', params: { id: String(request.id) } })}
                    >
                      <MaterialCommunityIcons name="map-marker-path" size={16} color={Colors.primary} />
                      <Text style={styles.ghostButtonText}>Ver ruta y datos</Text>
                    </TouchableOpacity>
                    {step ? (
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => advance(request)}
                        disabled={updatingId === request.id}
                        activeOpacity={0.85}
                      >
                        {updatingId === request.id ? (
                          <ActivityIndicator size="small" color={Colors.onPrimary} />
                        ) : (
                          <MaterialCommunityIcons name={step.icon} size={16} color={Colors.onPrimary} />
                        )}
                        <Text style={styles.primaryButtonText}>{step.label}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
      <BottomNav />
    </View>
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
    marginBottom: 14,
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
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  filterTextActive: {
    color: Colors.onPrimary,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 130,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghostButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
