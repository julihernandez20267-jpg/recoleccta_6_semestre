import { GradientButton } from '@/components/ui/GradientButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportLocationMap } from '../components/ReportLocationMap';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { useAuth } from '../context/AuthContext';
import { createReport, getReports } from '@/services/api';

const { width } = Dimensions.get('window');

export default function ReportFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = React.useState('plastic');
  const [observations, setObservations] = React.useState('');
  const [location, setLocation] = useState('');
  const [selectedCoordinate, setSelectedCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoUri, setPhotoUri] = useState('');
  const { user } = useAuth();
  const [apiFailed, setApiFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const canChooseLocationOnMap = user?.role !== 'guardian';

  useEffect(() => {
    checkApi();
  }, []);

  async function checkApi() {
    try {
      await getReports();
      setApiFailed(false);
    } catch (e) {
      setApiFailed(true);
      Alert.alert('Falla de Conexión', 'No se pudo conectar con el servidor de reportes.');
    }
  }

  const initialRegion = useMemo(
    () => ({
      latitude: 4.6097,
      longitude: -74.0817,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }),
    [],
  );

  const wasteTypes = [
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
    setLocation(`Lat ${coordinate.latitude.toFixed(5)}, Lng ${coordinate.longitude.toFixed(5)}`);
  };

  const handleWebLocationFallback = () => {
    const coordinate = {
      latitude: initialRegion.latitude,
      longitude: initialRegion.longitude,
    };
    setSelectedCoordinate(coordinate);
    setLocation(`Lat ${coordinate.latitude.toFixed(5)}, Lng ${coordinate.longitude.toFixed(5)}`);
  };

  const handleSubmitReport = async () => {
    if (apiFailed) {
      Alert.alert('Error', 'No es posible enviar reportes por una falla en la API.');
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
        neighborhood: 'Por confirmar',
        type: typeLabelMap[selectedType] ?? 'Residuo mixto',
        latitude: resolvedCoordinate.latitude,
        longitude: resolvedCoordinate.longitude,
        observations: cleanObservations || 'Sin observaciones adicionales.',
        reporter_name: user?.displayName?.trim() || user?.email?.split('@')[0] || 'Usuario Recoleccta',
        has_evidence: Boolean(photoUri),
      });

      if (res.success) {
        Alert.alert('Reporte enviado', 'El reporte fue registrado correctamente.', [
          {
            text: 'Ver reportes',
            onPress: () => router.push('/(tabs)/reports'),
          },
          {
            text: 'OK',
          },
        ]);
        setSelectedType('plastic');
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
        Alert.alert('Error de API', 'El servidor no responde. No se puede enviar el reporte.');
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
      {/* Header with Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
      </TouchableOpacity>

      {/* Location Selector */}
      <View style={styles.locationSection}>
        <TextInput
          style={styles.locationInput}
          value={location}
          onChangeText={setLocation}
          placeholder="Buscar ubicación..."
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
            {Platform.OS === 'web' ? (
              <TouchableOpacity style={[styles.mapPreview, styles.webMapFallback]} activeOpacity={0.85} onPress={handleWebLocationFallback}>
                <MaterialCommunityIcons name="map-outline" size={48} color={Colors.onSurfaceVariant} />
                <Text style={[Typography.bodyMd, styles.mapHintText]}>Haz clic para usar una ubicación de referencia en web.</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.mapPreview}>
                <ReportLocationMap
                  initialRegion={initialRegion}
                  selectedCoordinate={selectedCoordinate}
                  onCoordinateSelect={handleMapPress}
                />
              </View>
            )}
            <Text style={[Typography.bodySm, styles.mapSelectionHelper]}>
              {selectedCoordinate
                ? 'Ubicación seleccionada correctamente.'
                : 'Selecciona la ubicación del punto en el mapa antes de enviar el reporte.'}
            </Text>
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
          Tipo de Residuo
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
        <View style={{ marginVertical: 20, padding: 16, backgroundColor: '#fde8e8', borderRadius: 12, borderWidth: 1, borderColor: '#f8b4b4' }}>
          <Text style={{ color: Colors.error, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
            API del servidor fuera de línea. No se puede enviar el reporte.
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 10, alignSelf: 'center', backgroundColor: Colors.error, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }} 
            onPress={checkApi}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>Reintentar Conexión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <GradientButton
          label={loading ? "Enviando..." : "Enviar Reporte"}
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
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    minWidth: (width - 48 - 24) / 2,
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