import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { MapPressEvent, Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type ReportLocationMapProps = {
  initialRegion: Region;
  selectedCoordinate: Coordinate | null;
  onCoordinateSelect: (coordinate: Coordinate) => void;
};

export function ReportLocationMap({
  initialRegion,
  selectedCoordinate,
  onCoordinateSelect,
}: ReportLocationMapProps) {
  const handlePress = (event: MapPressEvent) => {
    onCoordinateSelect(event.nativeEvent.coordinate);
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initialRegion} onPress={handlePress}>
        {selectedCoordinate ? <Marker coordinate={selectedCoordinate} /> : null}
      </MapView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});

