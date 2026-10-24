import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { AppMapProps } from './types';

// Versión para celular: Google Maps. La versión web está en AppMap.web.tsx.
export function AppMap({ initialRegion, markers = [], lines = [], onPress, focus, style }: AppMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (focus) {
      mapRef.current?.animateToRegion({ ...focus, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
    }
  }, [focus]);

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
      onPress={onPress ? (event) => onPress(event.nativeEvent.coordinate) : undefined}
    >
      {lines.map((line) =>
        line.coordinates.length > 1 ? (
          <Polyline key={line.id} coordinates={line.coordinates} strokeColor={line.color} strokeWidth={line.width ?? 4} />
        ) : null,
      )}
      {markers.map((marker) =>
        marker.kind === 'waypoint' ? (
          <Marker key={marker.id} coordinate={marker.coordinate} title={marker.title} description={marker.description}>
            <View style={styles.waypointWrap}>
              <View
                style={[
                  styles.waypoint,
                  { borderColor: marker.color, transform: [{ scale: marker.active ? 1.4 : 1 }] },
                ]}
              >
                <MaterialCommunityIcons name="map-marker" size={marker.active ? 28 : 18} color={marker.color} />
              </View>
            </View>
          </Marker>
        ) : (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            pinColor={marker.color}
            title={marker.title}
            description={marker.description}
          />
        ),
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  waypointWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    overflow: 'visible',
  },
  waypoint: {
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 99,
    borderWidth: 1.5,
  },
});
