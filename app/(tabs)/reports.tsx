import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../../components/ui/BottomNav';
import { Colors } from '../../constants/Colors';
import { getReports } from '@/services/api';

type FilterKey = 'all' | 'completed' | 'in-progress' | 'pending';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'completed', label: 'Atendido' },
  { key: 'in-progress', label: 'En Proceso' },
  { key: 'pending', label: 'Pendiente' },
];

function getStatusChipStyle(status: string) {
  const normalized = status?.toLowerCase() || 'pendiente';
  if (normalized === 'completed' || normalized === 'completado') {
    return {
      container: styles.chipCompleted,
      text: styles.chipTextCompleted,
      label: 'ATENDIDO',
    };
  }

  if (normalized === 'in-progress' || normalized === 'en proceso') {
    return {
      container: styles.chipInProgress,
      text: styles.chipTextInProgress,
      label: 'EN PROCESO',
    };
  }

  return {
    container: styles.chipPending,
    text: styles.chipTextPending,
    label: 'PENDIENTE',
  };
}

export default function ReportsTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setApiFailed(false);
    try {
      const res = await getReports();
      if (res.success && res.data?.reports) {
        setReports(res.data.reports);
      } else {
        throw new Error('Error al obtener reportes');
      }
    } catch (e) {
      setApiFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filteredReports = useMemo(() => {
    if (activeFilter === 'all') {
      return reports;
    }
    return reports.filter((report) => {
      const status = report.status || 'pendiente';
      if (activeFilter === 'completed') return status === 'completed' || status === 'completado';
      if (activeFilter === 'in-progress') return status === 'in-progress' || status === 'en proceso';
      if (activeFilter === 'pending') return status === 'pending' || status === 'pendiente';
      return false;
    });
  }, [activeFilter, reports]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial de reportes</Text>
        <Text style={styles.headerSubtitle}>Historial de reportes y recolecciones</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const isActive = filter.key === activeFilter;
          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              activeOpacity={0.85}
              disabled={apiFailed}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : apiFailed ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={{ fontSize: 16, color: Colors.onSurface, fontWeight: '700', marginTop: 12 }}>Falla de API</Text>
          <Text style={{ fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
            El servidor no responde. No es posible visualizar el historial de reportes.
          </Text>
          <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 }} onPress={loadReports}>
            <Text style={{ color: Colors.onPrimary, fontWeight: '700' }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No hay reportes en este estado.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/report-detail/[id]', params: { id: String(item.id) } })
              }
              activeOpacity={0.9}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.statusChip, getStatusChipStyle(item.status).container]}>
                  <Text style={[styles.statusChipText, getStatusChipStyle(item.status).text]}>
                    {getStatusChipStyle(item.status).label}
                  </Text>
                </View>
                <Text style={styles.dateText}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Sin fecha'}</Text>
              </View>

              <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
              <Text style={styles.neighborhoodText} numberOfLines={1}>{item.neighborhood || 'Por confirmar'}</Text>

              <View style={styles.metaLine}>
                <MaterialCommunityIcons name="recycle" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{item.type}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailText}>VER DETALLE COMPLETO</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <BottomNav activeTab="reports" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  filterTextActive: {
    color: Colors.primary,
  },
  content: {
    paddingBottom: 130,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6ebe6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipCompleted: {
    backgroundColor: '#d8f3dc',
  },
  chipTextCompleted: {
    color: '#1f6f3a',
  },
  chipInProgress: {
    backgroundColor: '#d6f5d6',
  },
  chipTextInProgress: {
    color: '#25743a',
  },
  chipPending: {
    backgroundColor: '#fff2c8',
  },
  chipTextPending: {
    color: '#7a5d00',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  addressText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 3,
  },
  neighborhoodText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: 10,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  detailRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf2ed',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.primary,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  emptyTitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
});
