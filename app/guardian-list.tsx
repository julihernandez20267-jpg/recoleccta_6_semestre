import { getReports } from '@/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

function formatStatusLabel(status: string | undefined) {
  const normalized = status?.toLowerCase();
  if (normalized === 'pending') return 'pendiente';
  if (normalized === 'in-progress') return 'en proceso';
  if (normalized === 'completed') return 'completado';
  if (normalized === 'pendiente' || normalized === 'en proceso' || normalized === 'completado') return normalized;
  return status || 'pendiente';
}

export default function GuardianListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        throw new Error('No se pudieron obtener los reportes.');
      }
    } catch (e) {
      setApiFailed(true);
    } finally {
      setLoading(false);
    }
  }

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

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Reportes ciudadanos</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Si terminas tus rutas, puedes tomar reportes pendientes desde aquí.</Text>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/guardian-panel')}>
            <Text style={styles.tabText}>Rutas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Reportes</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : apiFailed ? (
          <View style={{ padding: 20, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.outlineVariant }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color={Colors.error} />
            <Text style={{ fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, marginBottom: 12 }}>
              Falla al conectar con la API de reportes.
            </Text>
            <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }} onPress={loadReports}>
              <Text style={{ color: Colors.onPrimary, fontSize: 12, fontWeight: '700' }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.reportListContent}>
              {reports.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => router.push({ pathname: '/report-detail/[id]', params: { id: String(item.id) } })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.address}</Text>
                    <Text style={styles.cardSubtitle}>{item.type} · #{item.id}</Text>
                  </View>
                  <Text style={styles.cardStatus}>{formatStatusLabel(item.status).toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Reportes abiertos</Text>
              <Text style={styles.summaryValue}>{reports.filter((item) => item.status !== 'completed' && item.status !== 'completado').length}</Text>
            </View>

            <Text style={styles.footNote}>Toca un reporte para ver detalle y decidir si lo tomas.</Text>
          </>
        )}
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}> 
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/guardian-panel')}>
          <MaterialCommunityIcons name="home-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/guardian-map')}>
          <MaterialCommunityIcons name="map-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Mapa</Text>
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
    paddingTop: 16,
    paddingBottom: 130,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#dce4d8',
  },
  infoText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dce3d9',
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
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce4d8',
  },
  reportList: {},
  reportListContent: {
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },
  cardStatus: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce4d8',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  footNote: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
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
});
