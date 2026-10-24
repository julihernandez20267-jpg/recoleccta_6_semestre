import type { LatLng, MapRegion } from './types';

// Encuadre del mapa para que se vean todos los puntos dados (con un poco de margen).
export function regionFor(points: LatLng[]): MapRegion {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: span * 1.4 + 0.004,
    longitudeDelta: span * 1.4 + 0.004,
  };
}
