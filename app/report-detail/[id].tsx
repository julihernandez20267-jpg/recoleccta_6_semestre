import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { getReports, updateReportStatus } from '@/services/api';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const parsedId = Number(id);

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  async function loadReport() {
    setLoading(true);
    setApiFailed(false);
    try {
      const res = await getReports();
      if (res.success && res.data?.reports) {
        const found = res.data.reports.find((item: any) => item.id === parsedId);
        setReport(found || null);
      } else {
        throw new Error('Error al cargar reporte.');
      }
    } catch (e) {
      setApiFailed(true);
      Alert.alert('Falla de Conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (apiFailed) return;
    setActionLoading(true);
    try {
      const guardianName = user?.displayName || 'Guardián';
      const res = await updateReportStatus(parsedId, newStatus, guardianName);
      if (res.success) {
        Alert.alert('Éxito', `El reporte ha sido cambiado a: ${newStatus}`);
        loadReport();
      } else {
        throw new Error(res.message || 'Error al actualizar el reporte.');
      }
    } catch (error: any) {
      const isNetworkError = !error.response || error.response.status >= 500;
      if (isNetworkError) {
        setApiFailed(true);
        Alert.alert('Falla de API', 'El servidor no responde. No se puede realizar la acción.');
      } else {
        Alert.alert('Error', error.message || 'No se pudo actualizar el estado.');
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del reporte</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No encontramos este reporte.</Text>
        </View>
      </View>
    );
  }

  const statusColorMap: Record<string, { bg: string; text: string }> = {
    completado: { bg: '#d8f3dc', text: '#1f6f3a' },
    completed: { bg: '#d8f3dc', text: '#1f6f3a' },
    'en proceso': { bg: '#d6f5d6', text: '#25743a' },
    'in-progress': { bg: '#d6f5d6', text: '#25743a' },
    pendiente: { bg: '#fff2c8', text: '#7a5d00' },
    pending: { bg: '#fff2c8', text: '#7a5d00' },
  };

  const chipColors = statusColorMap[report.status] ?? statusColorMap.pending;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}> 
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del reporte</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <View style={styles.topRow}>
            <View style={[styles.chip, { backgroundColor: chipColors.bg }]}> 
              <MaterialCommunityIcons name="check-decagram" size={12} color={chipColors.text} />
              <Text style={[styles.chipText, { color: chipColors.text }]}> 
                {(report.status || 'pendiente').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.reportId}>Reporte #{report.id.toString().padStart(4, '0')}</Text>
          </View>

          <Text style={styles.addressText}>{report.address}</Text>
          <Text style={styles.neighborhoodText}>{report.neighborhood || 'Por confirmar'}</Text>

          <View style={styles.dataBox}>
            <Text style={styles.dataLabel}>FECHA</Text>
            <Text style={styles.dataValue}>{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Sin fecha'}</Text>
          </View>

          <View style={styles.dataBox}>
            <Text style={styles.dataLabel}>UBICACIÓN</Text>
            <Text style={styles.dataValue}>{`Lat: ${report.latitude?.toFixed(5)}, Lng: ${report.longitude?.toFixed(5)}`}</Text>
          </View>
        </View>

        <View style={styles.associatedCard}>
          <Text style={styles.associatedTitle}>Información asociada</Text>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="recycle" size={16} color={Colors.primary} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>TIPO DE RESIDUO</Text>
              <Text style={styles.infoValue}>{report.type}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-outline" size={16} color={Colors.primary} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>REPORTADO POR</Text>
              <Text style={styles.infoValue}>{report.reporter_name || 'Ciudadano'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="image-outline" size={16} color={Colors.primary} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoLabel}>EVIDENCIA</Text>
              <Text style={styles.infoValue}>{report.has_evidence ? 'Foto adjunta' : 'Sin evidencia física'}</Text>
            </View>
          </View>

          {user?.role === 'guardian' && (report.status === 'pending' || report.status === 'pendiente') && !apiFailed && (
            <TouchableOpacity
              style={styles.takeButton}
              onPress={() => handleUpdateStatus('en proceso')}
              disabled={actionLoading}
            >
              <MaterialCommunityIcons name="map-marker-plus-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.takeButtonText}>{actionLoading ? "Procesando..." : "Tomar reporte (poner en proceso)"}</Text>
            </TouchableOpacity>
          )}

          {user?.role === 'guardian' && (report.status === 'in-progress' || report.status === 'en proceso') && !apiFailed && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleUpdateStatus('completado')}
              disabled={actionLoading}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.completeButtonText}>{actionLoading ? "Procesando..." : "Marcar reporte como completado"}</Text>
            </TouchableOpacity>
          )}

          {apiFailed && (
            <View style={{ marginVertical: 10, padding: 12, backgroundColor: '#fde8e8', borderRadius: 10, borderWidth: 1, borderColor: '#f8b4b4' }}>
              <Text style={{ color: Colors.error, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                Acciones deshabilitadas debido a una falla en la API.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  content: {
    paddingBottom: 24,
    gap: 12,
  },
  mainCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e6ebe6',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  reportId: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  neighborhoodText: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  dataBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  dataLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  associatedCard: {
    backgroundColor: '#f2f4f1',
    borderRadius: 14,
    padding: 16,
  },
  associatedTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    marginTop: 1,
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  takeButton: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#b3261e',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  takeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  completeButton: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1f6f3a',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
});
