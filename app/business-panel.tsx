import { BottomNav } from '@/components/ui/BottomNav';
import { ConnectionError } from '@/components/ui/ConnectionError';
import { ContainerStatusChip, StatusChip } from '@/components/ui/StatusChip';
import { useAuth } from '@/context/AuthContext';
import { getContainerRequests, getReports } from '@/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { formatRelative, normalizeStatus, OIL_LABELS } from '../constants/Reports';
import { homeRouteFor } from '../constants/Roles';
import { Typography } from '../constants/Typography';

const MAX_ITEMS = 5;

export default function BusinessPanelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  // Esta pantalla es solo para comercios.
  useEffect(() => {
    if (user && user.role !== 'business') router.replace(homeRouteFor(user.role));
  }, [user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setFailed(false);
    try {
      const [reportsRes, containersRes] = await Promise.all([getReports(), getContainerRequests()]);
      setReports((reportsRes.data?.reports || []).filter((r: any) => r.created_by === user.uid));
      setContainers(containersRes.data?.requests || []);
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

  // Los contadores suman recolecciones y bidones.
  const activeRequests =
    reports.filter((r) => normalizeStatus(r.status) !== 'completed').length +
    containers.filter((c) => c.status !== 'delivered').length;
  const attendedRequests = reports.length + containers.length - activeRequests;
  const businessName = user?.business?.name || user?.displayName || 'tu comercio';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
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
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="leaf" size={24} color={Colors.primary} />
            <Text style={[Typography.headlineMd, styles.brandText]}>Recoleccta</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[Colors.primary, Colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="storefront-outline" size={110} color="rgba(255,255,255,0.15)" />
          </View>
          <View style={styles.priorityPill}>
            <MaterialCommunityIcons name="star-circle" size={14} color={Colors.primary} />
            <Text style={styles.priorityPillText}>Comercio aliado · Atención prioritaria</Text>
          </View>
          <Text style={[Typography.displaySm, styles.heroTitle]} numberOfLines={2}>
            {businessName}
          </Text>
          <Text style={[Typography.bodyMd, styles.heroSubtitle]}>
            {user?.business?.type ? `${user.business.type}. ` : ''}Tus solicitudes se atienden antes que las demás.
          </Text>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/report-form')} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryFixed }]}>
              <MaterialCommunityIcons name="truck-outline" size={26} color={Colors.primary} />
            </View>
            <Text style={styles.actionTitle}>Solicitar recolección</Text>
            <Text style={styles.actionHint}>Aceite, plástico, papel, vidrio u orgánico</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/container-request')} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="barrel-outline" size={26} color={Colors.secondary} />
            </View>
            <Text style={styles.actionTitle}>Solicitar bidón</Text>
            <Text style={styles.actionHint}>Te lo llevamos para guardar el aceite usado</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 30 }} />
        ) : failed ? (
          <ConnectionError compact onRetry={() => load()} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{activeRequests}</Text>
                <Text style={styles.statLabel}>Solicitudes activas</Text>
                <Text style={styles.statHint}>Recolecciones y bidones</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: Colors.secondary }]}>{attendedRequests}</Text>
                <Text style={styles.statLabel}>Ya atendidas</Text>
                <Text style={styles.statHint}>Recogidas y entregados</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Mis solicitudes de recolección</Text>
            {reports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aún no has pedido recolecciones. Toca «Solicitar recolección» para empezar.</Text>
              </View>
            ) : (
              reports.slice(0, MAX_ITEMS).map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.itemCard}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: '/report-detail/[id]', params: { id: String(report.id) } })}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.itemTitle}>{report.type}</Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      #{report.id} · {formatRelative(report.created_at)}
                    </Text>
                  </View>
                  <StatusChip status={report.status} />
                </TouchableOpacity>
              ))
            )}

            <Text style={styles.sectionTitle}>Mis bidones</Text>
            {containers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Cuando pidas un bidón, aquí verás si ya va en camino o si fue entregado.</Text>
              </View>
            ) : (
              containers.slice(0, MAX_ITEMS).map((request) => (
                <View key={request.id} style={styles.itemCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.itemTitle}>
                      {request.quantity} {request.quantity === 1 ? 'bidón' : 'bidones'} · {OIL_LABELS[request.oil_type] ?? 'Aceite'}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {formatRelative(request.created_at)}
                      {request.handled_by_name ? ` · ${request.handled_by_name}` : ''}
                    </Text>
                  </View>
                  <ContainerStatusChip status={request.status} />
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
      <BottomNav activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    color: Colors.primary,
    fontWeight: '800',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 30,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroIconWrap: {
    position: 'absolute',
    right: 8,
    bottom: 4,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  priorityPillText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: Colors.onPrimary,
    marginBottom: 6,
    maxWidth: '80%',
  },
  heroSubtitle: {
    color: Colors.onPrimaryContainer,
    maxWidth: '80%',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  actionHint: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
  },
  statValue: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  statHint: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 10,
    marginTop: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  itemSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
  },
});
