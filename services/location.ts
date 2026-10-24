import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { reverseGeocode } from './api';

export type PlaceDescription = {
  address?: string;
  neighborhood?: string;
  city?: string;
  // Texto listo para mostrar: "Carrera 10, Santander, Girardot".
  label?: string;
};

export type CurrentPlace = PlaceDescription & {
  latitude: number;
  longitude: number;
};

export type LocationResult = { ok: true; place: CurrentPlace } | { ok: false; reason: 'denied' | 'unavailable' };

function buildLabel(parts: PlaceDescription): string | undefined {
  const label = [parts.address, parts.neighborhood, parts.city].filter(Boolean).join(', ');
  return label || undefined;
}

// Traduce coordenadas a una dirección legible. En el celular usa primero el servicio del
// teléfono; en web (o si el teléfono no encuentra nada) usa OpenStreetMap a través del backend.
export async function describePlace(latitude: number, longitude: number): Promise<PlaceDescription> {
  if (Platform.OS !== 'web') {
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo && (geo.street || geo.name)) {
        const place: PlaceDescription = {
          address: [geo.street, geo.streetNumber].filter(Boolean).join(' # ') || geo.name || undefined,
          neighborhood: geo.district || geo.subregion || undefined,
          city: geo.city || undefined,
        };
        return { ...place, label: buildLabel(place) };
      }
    } catch {
      // seguimos con el backend
    }
  }
  try {
    const res = await reverseGeocode(latitude, longitude);
    const place: PlaceDescription = {
      address: res.data?.address || undefined,
      neighborhood: res.data?.neighborhood || undefined,
      city: res.data?.city || undefined,
    };
    return { ...place, label: buildLabel(place) };
  } catch {
    return {};
  }
}

// Solo la posición del GPS (sin traducirla a dirección), por ejemplo para trazar una ruta.
export async function getCurrentCoords(): Promise<
  { ok: true; coords: { latitude: number; longitude: number } } | { ok: false; reason: 'denied' | 'unavailable' }
> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { ok: false, reason: 'denied' };
  try {
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, coords: { latitude: coords.latitude, longitude: coords.longitude } };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

// Pide permiso, toma la posición del GPS y la describe como dirección.
export async function getCurrentPlace(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const description = await describePlace(coords.latitude, coords.longitude);
    return { ok: true, place: { latitude: coords.latitude, longitude: coords.longitude, ...description } };
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
