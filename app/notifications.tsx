import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { ComponentProps, useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../components/ui/BottomNav';
import { ConnectionError } from '../components/ui/ConnectionError';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Colors } from '../constants/Colors';
import { formatRelative, normalizeStatus, STATUS_META } from '../constants/Reports';
import { Typography } from '../constants/Typography';
import { useAuth } from '../context/AuthContext';
import { getGuardianRoute, getReports } from '../services/api';
import type { AuthUser } from '../types/auth';

type NotificationItem = {
  key: string;
  title: string;
  body: string;
  date: string | null;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  reportId?: number;
};

const MAX_ITEMS = 25;

function reportNotification(report: any, forCitizen: boolean): NotificationItem {
  const status = normalizeStatus(report.status);
  const meta = STATUS_META[status];
  const place = report.address || 'el punto reportado';
  const base = { key: `report-${report.id}`, icon: meta.icon, color: meta.text, reportId: report.id };

  if (status === 'completed') {
    return {
      ...base,
      title: `Reporte #${report.id} atendido`,
      body: forCitizen
        ? `El punto en ${place} ya fue recolectado. ¡Gracias por reportar!`
        : `${report.guardian_name || 'Un guardián'} atendió el punto en ${place}.`,
      date: report.updated_at,
    };
  }
  if (status === 'in-progress') {
    return {
      ...base,
      title: `Reporte #${report.id} en proceso`,
      body: `${report.guardian_name || 'Un guardián'} está atendiendo el punto en ${place}.`,
      date: report.updated_at,
    };
  }
  return {
    ...base,
    title: forCitizen ? `Reporte #${report.id} recibido` : `Nuevo reporte pendiente #${report.id}`,
    body: forCitizen
      ? `Tu reporte en ${place} está pendiente de atención.`
      : `${report.type || 'Residuos'} en ${place}.`,
    date: report.created_at,
  };
}

// Las notificaciones se arman con el estado actual de los reportes y rutas del usuario.
async function buildNotifications(user: AuthUser): Promise<NotificationItem[]> {
  const reportsRes = await getReports();
  const reports: any[] = reportsRes.data?.reports || [];
  const items: NotificationItem[] = [];

  if (user.role === 'user') {
    reports.filter((r) => r.created_by === user.uid).forEach((r) => items.push(reportNotification(r, true)));
  } else {
    reports.forEach((r) => items.push(reportNotification(r, false)));
  }

  if (user.role === 'guardian') {
    const routeRes = await getGuardianRoute(user.uid);
    (routeRes.data?.assignments || []).forEach((a: any) => {
      const active = a.status === 'in-progress';
      items.push({
        key: `route-${a.id}`,
        title: active ? `Ruta activa: ${a.route?.name}` : `Ruta en cola: ${a.route?.name}`,
        body: active
          ? `Zona ${a.route?.zone}. Ábrela en el mapa para empezar el recorrido.`
          : `Zona ${a.route?.zone}. Se activará cuando termines la ruta actual.`,
        date: a.startedAt || a.assignedAt,
        icon: 'map-marker-path',
        color: Colors.primary,
      });
    });
  }

  return items
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, MAX_ITEMS);
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = user?.role ?? 'user';
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setFailed(false);
    try {
      setNotifications(await buildNotifications(user));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={[Typography.headlineSm, { color: Colors.onSurface }]}>Notificaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : failed ? (
        <ConnectionError
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
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
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-check-outline" size={44} color={Colors.outline} />
              <Text style={[Typography.titleSm, { color: Colors.onSurface }]}>Estás al día</Text>
              <Text style={[Typography.bodyMd, styles.emptyText]}>
                {role === 'user'
                  ? 'Aquí verás cuando tus reportes sean recibidos, tomados por un guardián o atendidos.'
                  : 'Aquí verás los reportes nuevos y los cambios en tus rutas.'}
              </Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={item.reportId ? 0.85 : 1}
                disabled={!item.reportId}
                onPress={() =>
                  item.reportId &&
                  router.push({ pathname: '/report-detail/[id]', params: { id: String(item.reportId) } })
                }
              >
                <SurfaceCard level={1} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.titleSm, { color: Colors.onSurface }]}>{item.title}</Text>
                      <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant, marginTop: 4 }]}>{item.body}</Text>
                      <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant, marginTop: 8 }]}>
                        {formatRelative(item.date)}
                      </Text>
                    </View>
                  </View>
                </SurfaceCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
      {role !== 'admin' && <BottomNav activeTab="profile" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
