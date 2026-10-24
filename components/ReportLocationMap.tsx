import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { AppMap } from './maps/AppMap';
import type { LatLng, MapRegion } from './maps/types';

type ReportLocationMapProps = {
  initialRegion: MapRegion;
  selectedCoordinate: LatLng | null;
  onCoordinateSelect: (coordinate: LatLng) => void;
};

export function ReportLocationMap({ initialRegion, selectedCoordinate, onCoordinateSelect }: ReportLocationMapProps) {
  return (
    <View style={styles.container}>
      <AppMap
        initialRegion={initialRegion}
        onPress={onCoordinateSelect}
        focus={selectedCoordinate}
        markers={
          selectedCoordinate
            ? [{ id: 'selected', coordinate: selectedCoordinate, color: Colors.error, title: 'Punto del reporte' }]
            : []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
