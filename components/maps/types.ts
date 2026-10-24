import type { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { latitude: number; longitude: number };

export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

export type MapMarker = {
  id: string;
  coordinate: LatLng;
  color: string;
  title?: string;
  description?: string;
  // 'waypoint': punto de una ruta (círculo con ícono); 'pin': marcador normal.
  kind?: 'pin' | 'waypoint';
  active?: boolean;
};

export type MapLine = {
  id: string;
  coordinates: LatLng[];
  color: string;
  width?: number;
};

export type AppMapProps = {
  initialRegion: MapRegion;
  markers?: MapMarker[];
  lines?: MapLine[];
  onPress?: (coordinate: LatLng) => void;
  // Cuando cambia, el mapa se centra en ese punto (por ejemplo, la ubicación del GPS).
  focus?: LatLng | null;
  style?: StyleProp<ViewStyle>;
};
