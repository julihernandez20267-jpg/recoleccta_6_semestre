import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../../constants/Colors';
import { useReports } from '../../constants/reportData';

export default function MapTabScreen() {
  const reports = useReports();

  const visibleReports = reports.filter((item) => item.status !== 'completed');

  const markerColor = (status: 'pending' | 'in-progress' | 'completed') => {
    if (status === 'pending') return '#b3261e';
    if (status === 'in-progress') return '#e18d00';
    return '#1f6f3a';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa de reportes</Text>
        <Text style={styles.subtitle}>Rojo: pendiente · Naranja: en proceso</Text>
      </View>

      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{

            latitude: 4.305,
            longitude: -74.805,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          {visibleReports.map((item) => (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              pinColor={markerColor(item.status)}
              title={`Reporte #${item.id}`}
              description={item.address}
            />
          ))}
        </MapView>
      </View>

      {visibleReports.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.emptyText}>No hay reportes abiertos en este momento.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 12,
  },
  mapCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dce4d8',
    backgroundColor: Colors.surface,
  },
  map: {
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.onSurface },
  subtitle: { marginTop: 2, fontSize: 12, color: Colors.onSurfaceVariant },
  emptyBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce4d8',
    backgroundColor: Colors.surface,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
});
