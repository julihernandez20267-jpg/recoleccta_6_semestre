import { ConnectionError } from '@/components/ui/ConnectionError';
import { GradientButton } from '@/components/ui/GradientButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportLocationMap } from '../components/ReportLocationMap';
import { Colors } from '../constants/Colors';
import { DEFAULT_REGION } from '../constants/Map';
import { Typography } from '../constants/Typography';
import { useAuth } from '../context/AuthContext';
import { createReport, getReports } from '@/services/api';
import { getCurrentPlace, locationErrorMessage } from '@/services/location';

export default function ReportFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const defaultType = isBusiness ? 'cooking-oil' : 'plastic';
  const [selectedType, setSelectedType] = React.useState(defaultType);
  const [neighborhood, setNeighborhood] = useState('');
  const [locating, setLocating] = useState(false);
  const [observations, setObservations] = React.useState('');
  const [location, setLocation] = useState('');
  const [selectedCoordinate, setSelectedCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoUri, setPhotoUri] = useState('');
  const [apiFailed, setApiFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const canChooseLocationOnMap = user?.role !== 'guardian';

  useEffect(() => {
    checkApi();
  }, []);

  // A los comercios les preguntamos de una vez si usamos su ubicación actual.
  useEffect(() => {
    if (!isBusiness) return;
    Alert.alert('¿Usar tu ubicación actual?', 'Así sabremos dónde recoger. También puedes marcar el punto en el mapa.', [
      { text: 'Marcar en el mapa', style: 'cancel' },
      { text: 'Usar mi ubicación', onPress: () => void handleUseCurrentLocation() },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusiness]);

  async function handleUseCurrentLocation() {
    setLocating(true);
    const result = await getCurrentPlace();
    setLocating(false);
    if (!result.ok) {
      Alert.alert('Ubicación', locationErrorMessage(result.reason, 'marca el punto tocando el mapa'));
      return;
    }
    const { place } = result;
    setSelectedCoordinate({ latitude: place.latitude, longitude: place.longitude });
    if (place.address) setLocation((current) => current || place.address || '');
    if (place.neighborhood) setNeighborhood(place.neighborhood);
  }

  async function checkApi() {
    try {
      await getReports();
      setApiFailed(false);
    } catch (e) {
      setApiFailed(true);
      Alert.alert('Sin conexión', 'No pudimos conectarnos con el servidor. Intenta de nuevo en un momento.');
    }
  }

  const initialRegion = useMemo(() => ({ ...DEFAULT_REGION, latitudeDelta: 0.02, longitudeDelta: 0.02 }), []);

  // El aceite es un servicio exclusivo de comercios.
  const oilTypes = [
    { id: 'cooking-oil', label: 'Aceite de cocina', icon: 'pot-steam-outline' },
    { id: 'motor-oil', label: 'Aceite de motor', icon: 'oil' },
  ];

  const wasteTypes = [
    ...(isBusiness ? oilTypes : []),
    { id: 'plastic', label: 'Plástico', icon: 'bottle-soda' },
    { id: 'paper', label: 'Papel', icon: 'file-document' },
    { id: 'glass', label: 'Vidrio', icon: 'glass-wine' },
    { id: 'organic', label: 'Orgánico', icon: 'leaf' },
  ];

  const typeLabelMap = wasteTypes.reduce<Record<string, string>>((acc, type) => {
    acc[type.id] = type.label;
    return acc;
  }, {});

  const handleMapPress = (coordinate: { latitude: number; longitude: number }) => {
    setSelectedCoordinate(coordinate);
  };

  const handleSubmitReport = async () => {
    if (apiFailed) {
      Alert.alert('Sin conexión', 'No pudimos conectarnos con el servidor. Intenta de nuevo en un momento.');
      return;
    }
    if (canChooseLocationOnMap && !selectedCoordinate) {
      Alert.alert('Ubicación requerida', 'Selecciona un punto en el mapa antes de enviar el reporte.');
      return;
    }

    const resolvedCoordinate = selectedCoordinate ?? {
      latitude: initialRegion.latitude,
      longitude: initialRegion.longitude,
    };

    const cleanAddress = location.trim();
    const resolvedAddress = cleanAddress || `Lat ${resolvedCoordinate.latitude.toFixed(5)}, Lng ${resolvedCoordinate.longitude.toFixed(5)}`;
    const cleanObservations = observations.trim();

    setLoading(true);
    try {
      const res = await createReport({
        address: resolvedAddress,
        neighborhood: neighborhood || 'Por confirmar',
        type: typeLabelMap[selectedType] ?? 'Residuo mixto',
        latitude: resolvedCoordinate.latitude,
        longitude: resolvedCoordinate.longitude,
        observations: cleanObservations || 'Sin observaciones adicionales.',
        reporter_name: user?.displayName?.trim() || user?.email?.split('@')[0] || 'Usuario Recoleccta',
        has_evidence: Boolean(photoUri),
      });

      if (res.success) {
        Alert.alert(
          isBusiness ? '¡Solicitud enviada!' : '¡Reporte enviado!',
          isBusiness
            ? 'Tu solicitud tiene prioridad. Te avisaremos cuando un guardián vaya en camino.'
            : 'Gracias por ayudar. Te avisaremos cuando un guardián lo atienda.',
          [
          {
            text: isBusiness ? 'Ver mis solicitudes' : 'Ver mis reportes',
            onPress: () => router.replace(isBusiness ? '/business-panel' : '/(tabs)/reports'),
          },
          {
            text: 'Listo',
            onPress: () => router.back(),
          },
          ],
        );
        setSelectedType(defaultType);
        setNeighborhood('');
        setObservations('');
        setLocation('');
        setSelectedCoordinate(null);
        setPhotoUri('');
      } else {
        throw new Error(res.message || 'Error al enviar reporte.');
      }
    } catch (error: any) {
      const isNetworkError = !error.response || error.response.status >= 500;
      if (isNetworkError) {
        setApiFailed(true);
        Alert.alert('Sin conexión', 'No pudimos conectarnos con el servidor. Intenta de nuevo en un momento.');
      } else {
        Alert.alert('Error', error.message || 'No se pudo enviar el reporte.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Permite acceso a la galería para adjuntar la evidencia.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const selectedUri = result.assets?.[0]?.uri;
    if (selectedUri) {
      setPhotoUri(selectedUri);
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('No disponible', 'En web usa la galería para adjuntar una imagen.');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Permite acceso a la cámara para tomar la foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const selectedUri = result.assets?.[0]?.uri;
    if (selectedUri) {
      setPhotoUri(selectedUri);
    }
  };

  const handleAttachEvidence = () => {
    if (Platform.OS === 'web') {
      void handlePickFromGallery();
      return;
    }

    Alert.alert('Adjuntar evidencia', 'Elige cómo quieres agregar la foto.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galería', onPress: () => void handlePickFromGallery() },
      { text: 'Cámara', onPress: () => void handleTakePhoto() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.headlineSm, { color: Colors.onSurface }]}>
            {isBusiness ? 'Solicitar recolección' : 'Nuevo reporte'}
          </Text>
          <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant }]}>
            {isBusiness ? 'Dinos qué residuo recogemos en tu local.' : 'Cuéntanos dónde hay un punto lleno.'}
          </Text>
        </View>
      </View>

      {/* Location Selector */}
      <View style={styles.locationSection}>
        <TextInput
          style={styles.locationInput}
          value={location}
          onChangeText={setLocation}
          placeholder="Dirección o punto de referencia (opcional)"
          placeholderTextColor={Colors.onSurfaceVariant}
        />
        <MaterialCommunityIcons
          name="map-marker"
          size={20}
          color={Colors.onSurfaceVariant}
          style={styles.locationIcon}
        />
        {canChooseLocationOnMap ? (
          <>
            <View style={styles.mapPreview}>
              <ReportLocationMap
                initialRegion={initialRegion}
                selectedCoordinate={selectedCoordinate}
                onCoordinateSelect={handleMapPress}
              />
            </View>
            <Text style={[Typography.bodySm, styles.mapSelectionHelper]}>
              {selectedCoordinate
                ? `Punto marcado: ${selectedCoordinate.latitude.toFixed(5)}, ${selectedCoordinate.longitude.toFixed(5)}`
                : 'Toca el mapa para marcar dónde está el punto lleno.'}
            </Text>
            <TouchableOpacity style={styles.gpsButton} onPress={handleUseCurrentLocation} disabled={locating} activeOpacity={0.85}>
              {locating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={18} color={Colors.primary} />
              )}
              <Text style={styles.gpsButtonText}>{locating ? 'Buscando tu ubicación...' : 'Usar mi ubicación actual'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.helperCard}>
            <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
            <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant, flex: 1 }]}>Como guardián, el mapa está disponible en tu pestaña de rutas. Aquí solo registras la información del punto.</Text>
          </View>
        )}
      </View>

      {/* Waste Type Selector */}
      <View style={styles.wasteTypeSection}>
        <Text style={[Typography.titleMd, { color: Colors.onSurface, marginBottom: 16 }]}>
          Tipo de residuo
        </Text>
        <View style={styles.wasteTypeGrid}>
          {wasteTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setSelectedType(type.id)}
              style={[
                styles.wasteTypeButton,
                selectedType === type.id && styles.selectedWasteTypeButton,
              ]}
            >
              <MaterialCommunityIcons
                name={type.icon as any}
                size={32}
                color={selectedType === type.id ? Colors.primary : Colors.onSurfaceVariant}
              />
              <Text
                style={[
                  Typography.bodyMd,
                  {
                    color: selectedType === type.id ? Colors.primary : Colors.onSurfaceVariant,
                    marginTop: 8,
                  },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Observations */}
      <View style={styles.observationsSection}>
        <Text style={[Typography.titleMd, { color: Colors.onSurface, marginBottom: 16 }]}>
          Observaciones
        </Text>
        <TextInput
          style={styles.observationsInput}
          value={observations}
          onChangeText={setObservations}
          placeholder="Describe el estado del punto de recolección..."
          placeholderTextColor={Colors.onSurfaceVariant}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Photo Upload */}
      <TouchableOpacity style={styles.photoUpload} activeOpacity={0.85} onPress={handleAttachEvidence}>
        {photoUri ? (
          <View style={styles.photoPreviewWrap}>
            <ExpoImage source={photoUri} style={styles.photoPreview} contentFit="cover" cachePolicy="none" />
            <View style={styles.photoOverlayBadge}>
              <MaterialCommunityIcons name="check-circle" size={18} color={Colors.primary} />
              <Text style={[Typography.labelSm, styles.photoOverlayText]}>Evidencia adjunta</Text>
            </View>
            <View style={styles.photoActionsRow}>
              <TouchableOpacity style={styles.photoActionButton} activeOpacity={0.85} onPress={handleAttachEvidence}>
                <MaterialCommunityIcons name="camera-retake-outline" size={18} color={Colors.primary} />
                <Text style={[Typography.labelMd, styles.photoActionText]}>Cambiar foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.photoUploadContent}>
            <MaterialCommunityIcons name="camera-plus-outline" size={32} color={Colors.onSurfaceVariant} />
            <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant, marginTop: 8 }]}>Agregar foto</Text>
            <Text style={[Typography.bodySm, styles.photoHelperText]}>Toma una foto o elige una desde la galería.</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Submit Button */}
      {apiFailed ? (
        <View style={{ marginTop: 32, marginBottom: 40 }}>
          <ConnectionError
            compact
            message="Para enviar el reporte necesitamos conexión con el servidor. Tu información no se ha perdido."
            onRetry={checkApi}
          />
        </View>
      ) : (
        <GradientButton
          label={loading ? "Enviando..." : isBusiness ? "Enviar solicitud" : "Enviar reporte"}
          onPress={handleSubmitReport}
          icon="send"
          style={{ marginTop: 32, marginBottom: 40 }}
          disabled={loading}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  gpsButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
  },
  header: {
    marginBottom: 32,
  },
  locationSection: {
    marginBottom: 32,
  },
  locationInput: {
    height: 56,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 48,
    fontSize: 16,
    color: Colors.onSurface,
  },
  locationIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
  },
  mapPreview: {
    height: 192,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: Colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  webMapFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mapHintText: {
    color: Colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'center',
  },
  mapSelectionHelper: {
    marginTop: 10,
    color: Colors.onSurfaceVariant,
  },
  helperCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  wasteTypeSection: {
    marginBottom: 32,
  },
  wasteTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wasteTypeButton: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  selectedWasteTypeButton: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  observationsSection: {
    marginBottom: 32,
  },
  observationsInput: {
    height: 96,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.onSurface,
  },
  photoUpload: {
    minHeight: 80,
    borderWidth: 2,
    borderColor: 'rgba(191, 202, 186, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoUploadContent: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  photoHelperText: {
    color: Colors.onSurfaceVariant,
    marginTop: 6,
    textAlign: 'center',
  },
  photoPreviewWrap: {
    width: '100%',
  },
  photoPreview: {
    width: '100%',
    height: 208,
  },
  photoOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoOverlayText: {
    color: Colors.primary,
  },
  photoActionsRow: {
    padding: 12,
    backgroundColor: Colors.surfaceContainerLow,
  },
  photoActionButton: {
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoActionText: {
    color: Colors.primary,
  },
});