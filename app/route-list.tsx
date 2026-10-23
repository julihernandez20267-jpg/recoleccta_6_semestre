import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomNav } from '../components/ui/BottomNav';
import { GradientButton } from '../components/ui/GradientButton';
import { StatusChip } from '../components/ui/StatusChip';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';

const { width } = Dimensions.get('window');

export default function RouteListScreen() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { key: 'all', label: 'Todas las Rutas' },
    { key: 'active', label: 'En Progreso' },
    { key: 'scheduled', label: 'Agendadas' },
    { key: 'completed', label: 'Completadas' },
  ];

  const routes = [
    {
      id: 1,
      name: 'Ruta Norte 04',
      status: 'in-progress',
      progress: 75,
      guardian: 'María González',
      stops: '12/15',
      eta: '24 min',
      type: 'active',
    },
    {
      id: 2,
      name: 'Ruta Sur 02',
      status: 'scheduled',
      date: 'Hoy, 14:30',
      guardian: 'Carlos Rodríguez',
      stops: '18',
      type: 'scheduled',
    },
    {
      id: 3,
      name: 'Ruta Este 01',
      status: 'completed',
      efficiency: '92%',
      co2: '45kg',
      type: 'completed',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.labelLg, { color: Colors.onSurfaceVariant }]}>
            Panel de empresa
          </Text>
          <Text style={[Typography.headlineMd, { color: Colors.onSurface, marginTop: 8 }]}>
            Rutas de recolección{'\n'}activas y programadas
          </Text>
        </View>

        {/* Stats Counter */}
        <View style={styles.statsCounter}>
          <View style={styles.statItem}>
            <Text style={[Typography.displaySm, { color: Colors.primary }]}>
              8
            </Text>
            <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant }]}>
              En Progreso
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[Typography.displaySm, { color: Colors.secondary }]}>
              12
            </Text>
            <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant }]}>
              Agendadas
            </Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={[
                styles.filterPill,
                activeFilter === filter.key && styles.activeFilterPill,
              ]}
            >
              <Text
                style={[
                  Typography.bodyMd,
                  {
                    color: activeFilter === filter.key ? Colors.primary : Colors.onSurfaceVariant,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Routes List */}
        <View style={styles.routesList}>
          {routes.map((route) => (
            <SurfaceCard key={route.id} level={2} style={styles.routeCard}>
              <View style={styles.routeCardContent}>
                <View style={styles.routeHeader}>
                  <StatusChip
                    status={
                      route.status === 'in-progress' ? 'in-progress' :
                      route.status === 'scheduled' ? 'pending' : 'completed'
                    }
                    label={
                      route.status === 'in-progress' ? 'En Progreso' :
                      route.status === 'scheduled' ? 'Agendada' : 'Completada'
                    }
                  />
                  <TouchableOpacity>
                    <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <Text style={[Typography.titleMd, { color: Colors.onSurface, marginTop: 16 }]}>
                  {route.name}
                </Text>
                <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant, marginTop: 4 }]}>
                  {route.guardian}
                </Text>

                {route.type === 'active' && (
                  <>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${route.progress || 0}%` }]} />
                      </View>
                      <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant, marginTop: 8 }]}>
                        {route.stops} paradas • {route.eta}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.routeAction}>
                      <Text style={[Typography.bodyMd, { color: Colors.primary }]}>
                        Ver Mapa en Tiempo Real
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </>
                )}

                {route.type === 'scheduled' && (
                  <>
                    <View style={styles.scheduledInfo}>
                      <MaterialCommunityIcons name="calendar-clock" size={20} color={Colors.onSurfaceVariant} />
                      <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant, marginLeft: 8 }]}>
                        {route.date}
                      </Text>
                    </View>
                    <View style={styles.scheduledMetrics}>
                      <View style={styles.metric}>
                        <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant }]}>
                          Paradas
                        </Text>
                        <Text style={[Typography.titleSm, { color: Colors.onSurface }]}>
                          {route.stops}
                        </Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant }]}>
                          Distancia
                        </Text>
                        <Text style={[Typography.titleSm, { color: Colors.onSurface }]}>
                          12.5 km
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.routeAction}>
                      <Text style={[Typography.bodyMd, { color: Colors.primary }]}>
                        Editar Horario
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </>
                )}

                {route.type === 'completed' && (
                  <>
                    <View style={styles.completedMetrics}>
                      <View style={styles.metric}>
                        <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant }]}>
                          Eficiencia
                        </Text>
                        <Text style={[Typography.titleSm, { color: Colors.onSurface }]}>
                          {route.efficiency}
                        </Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant }]}>
                          CO2 Ahorrado
                        </Text>
                        <Text style={[Typography.titleSm, { color: Colors.onSurface }]}>
                          {route.co2}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.routeAction}>
                      <Text style={[Typography.bodyMd, { color: Colors.primary }]}>
                        Reporte Completo
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </SurfaceCard>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <View style={styles.fab}>
        <GradientButton
          label="CREAR NUEVA RUTA"
          onPress={() => {}}
          icon="map-marker-plus"
          style={{ paddingHorizontal: 24, height: 56, borderRadius: 28 }}
        />
      </View>

      {/* Bottom Nav */}
      <BottomNav activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 32,
  },
  statsCounter: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.outlineVariant,
    marginHorizontal: 24,
  },
  filtersContainer: {
    marginBottom: 24,
  },
  filtersContent: {
    paddingHorizontal: 4,
  },
  filterPill: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainerHigh,
    marginRight: 12,
  },
  activeFilterPill: {
    backgroundColor: Colors.primary,
  },
  routesList: {
    gap: 16,
  },
  routeCard: {
    marginBottom: 16,
  },
  routeCardContent: {
    padding: 24,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  routeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191, 202, 186, 0.1)',
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  scheduledMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  completedMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metric: {
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
  },
});