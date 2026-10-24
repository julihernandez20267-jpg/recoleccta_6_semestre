import * as Location from 'expo-location';
import { Platform } from 'react-native';

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

// alternative: qué puede hacer la persona en esa pantalla si no hay ubicación
// (p. ej. 'marca el punto en el mapa' o 'escribe la dirección').
export function locationErrorMessage(reason: 'denied' | 'unavailable', alternative: string): string {
  if (reason === 'denied') {
    return Platform.OS === 'web'
      ? `El navegador no dio permiso de ubicación. Actívalo con el ícono del candado junto a la dirección de la página y vuelve a intentarlo, o ${alternative}.`
      : `No diste permiso de ubicación. Puedes activarlo en los ajustes del teléfono, o ${alternative}.`;
  }
  return Platform.OS === 'web'
    ? `No pudimos obtener tu ubicación desde este computador. Inténtalo desde el celular, o ${alternative}.`
    : `No pudimos obtener tu ubicación. Revisa que el GPS esté encendido, o ${alternative}.`;
}
