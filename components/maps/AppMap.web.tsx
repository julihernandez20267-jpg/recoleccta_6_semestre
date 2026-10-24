import 'leaflet/dist/leaflet.css';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { AppMapProps, LatLng } from './types';

// Versión para navegador: OpenStreetMap con Leaflet (no necesita clave de Google).

function zoomFromDelta(delta: number) {
  return Math.min(18, Math.max(3, Math.round(Math.log2(360 / delta))));
}

function ClickHandler({ onPress }: { onPress?: (coordinate: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onPress?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function FocusController({ focus }: { focus?: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.latitude, focus.longitude], 16, { duration: 0.6 });
  }, [focus, map]);
  return null;
}

export function AppMap({ initialRegion, markers = [], lines = [], onPress, focus, style }: AppMapProps) {
  return (
    <View style={[styles.container, style]}>
      <MapContainer
        center={[initialRegion.latitude, initialRegion.longitude]}
        zoom={zoomFromDelta(initialRegion.latitudeDelta)}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPress={onPress} />
        <FocusController focus={focus} />
        {lines.map((line) =>
          line.coordinates.length > 1 ? (
            <Polyline
              key={line.id}
              positions={line.coordinates.map((c) => [c.latitude, c.longitude] as [number, number])}
              pathOptions={{ color: line.color, weight: line.width ?? 4 }}
            />
          ) : null,
        )}
        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.coordinate.latitude, marker.coordinate.longitude]}
            radius={marker.active ? 12 : marker.kind === 'waypoint' ? 7 : 9}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: marker.color, fillOpacity: 1 }}
          >
            {marker.title ? (
              <Tooltip>
                {marker.title}
                {marker.description ? ` · ${marker.description}` : ''}
              </Tooltip>
            ) : null}
          </CircleMarker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
