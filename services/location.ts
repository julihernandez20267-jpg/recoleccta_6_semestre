import * as Location from 'expo-location';

export type CurrentPlace = {
  latitude: number;
  longitude: number;
  address?: string;
  neighborhood?: string;
};

export type LocationResult = { ok: true; place: CurrentPlace } | { ok: false; reason: 'denied' | 'unavailable' };

// Pide permiso, toma la posición del GPS y trata de traducirla a una dirección legible.
export async function getCurrentPlace(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const place: CurrentPlace = { latitude: coords.latitude, longitude: coords.longitude };
    try {
      const [geo] = await Location.reverseGeocodeAsync(coords);
      if (geo) {
        place.address = [geo.street, geo.streetNumber].filter(Boolean).join(' ') || geo.name || undefined;
        place.neighborhood = geo.district || geo.subregion || geo.city || undefined;
      }
    } catch {
      // Sin dirección legible igual sirven las coordenadas.
    }
    return { ok: true, place };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export const LOCATION_ERROR_MESSAGES: Record<'denied' | 'unavailable', string> = {
  denied: 'No diste permiso de ubicación. Puedes marcar el punto en el mapa o escribir la dirección.',
  unavailable: 'No pudimos obtener tu ubicación. Revisa que el GPS esté encendido o marca el punto en el mapa.',
};
