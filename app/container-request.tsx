import { AppMap } from '@/components/maps/AppMap';
import type { LatLng } from '@/components/maps/types';
import { ConnectionError } from '@/components/ui/ConnectionError';
import { GradientButton } from '@/components/ui/GradientButton';
import { createContainerRequest } from '@/services/api';
import { describePlace, getCurrentPlace, locationErrorMessage } from '@/services/location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';

const OIL_OPTIONS = [
  { key: 'cooking', label: 'Aceite de cocina', hint: 'Restaurantes y cocinas', icon: 'pot-steam-outline' },
  { key: 'motor', label: 'Aceite de motor', hint: 'Talleres y gasolineras', icon: 'oil' },
] as const;

const MAX_QUANTITY = 10;

export default function ContainerRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [oilType, setOilType] = useState<'cooking' | 'motor'>('cooking');
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [locating, setLocating] = useState(false);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [describing, setDescribing] = useState(false);
  const [addressNotFound, setAddressNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleUseCurrentLocation() {
    setLocating(true);
    const result = await getCurrentPlace();
    setLocating(false);
    if (!result.ok) {
      Alert.alert('Ubicación', locationErrorMessage(result.reason, 'escribe la dirección de entrega'));
      return;
    }
    const { place } = result;
    setPoint({ latitude: place.latitude, longitude: place.longitude });
    applyDescription(place.label);
  }

  function applyDescription(label?: string) {
    setAddressNotFound(!label);
    if (label) setAddress(label);
  }

  // Si el punto del GPS no es exacto, la persona toca el mapa donde está su negocio.
  async function handleMapPress(coordinate: LatLng) {
    setPoint(coordinate);
    setDescribing(true);
    const description = await describePlace(coordinate.latitude, coordinate.longitude);
    setDescribing(false);
    applyDescription(description.label);
  }

  async function handleSubmit() {
    if (address.trim().length < 4) {
      Alert.alert('Dirección requerida', 'Escribe a dónde llevamos el bidón o usa tu ubicación actual.');
      return;
    }
    setSending(true);
    setFailed(false);
    try {
      await createContainerRequest({
        oil_type: oilType,
        quantity,
        address: address.trim(),
        latitude: point?.latitude,
        longitude: point?.longitude,
        notes: notes.trim() || undefined,
      });
      Alert.alert('¡Solicitud enviada!', 'Te avisaremos cuando el bidón vaya en camino.', [
        { text: 'Listo', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (!error.response || error.response.status >= 500) {
        setFailed(true);
      } else {
        Alert.alert('No se pudo enviar', error.response?.data?.detail || 'Revisa los datos e intenta de nuevo.');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.headlineSm, { color: Colors.onSurface }]}>Solicitar bidón</Text>
          <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant }]}>
            Te llevamos un bidón para guardar el aceite usado de forma segura.
          </Text>
        </View>
      </View>

      <Text style={styles.label}>¿Para qué tipo de aceite?</Text>
      <View style={styles.optionsRow}>
        {OIL_OPTIONS.map((option) => {
          const selected = oilType === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.optionCard, selected && styles.optionCardActive]}
              onPress={() => setOilType(option.key)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name={option.icon} size={30} color={selected ? Colors.primary : Colors.onSurfaceVariant} />
              <Text style={[styles.optionTitle, selected && { color: Colors.primary }]}>{option.label}</Text>
              <Text style={styles.optionHint}>{option.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>¿Cuántos bidones?</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepButton, quantity <= 1 && styles.stepButtonDisabled]}
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
        >
          <MaterialCommunityIcons name="minus" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.quantity}>{quantity}</Text>
        <TouchableOpacity
          style={[styles.stepButton, quantity >= MAX_QUANTITY && styles.stepButtonDisabled]}
          onPress={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
          disabled={quantity >= MAX_QUANTITY}
        >
          <MaterialCommunityIcons name="plus" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Dirección de entrega</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Ej. Calle 17 # 10-25, Centro"
        placeholderTextColor={Colors.onSurfaceVariant}
      />
      <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation} disabled={locating} activeOpacity={0.85}>
        {locating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={Colors.primary} />
        )}
        <Text style={styles.locationButtonText}>{locating ? 'Buscando tu ubicación...' : 'Usar mi ubicación actual'}</Text>
      </TouchableOpacity>

      {point ? (
        <View style={styles.mapBox}>
          <View style={styles.mapFrame}>
            <AppMap
              initialRegion={{ ...point, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
              focus={point}
              onPress={handleMapPress}
              markers={[{ id: 'delivery', coordinate: point, color: Colors.error, title: 'Punto de entrega' }]}
            />
          </View>
          <Text style={styles.mapHint}>
            {describing
              ? 'Buscando la dirección...'
              : addressNotFound
                ? 'No encontramos la dirección exacta de este punto. Escríbela arriba (ej. Calle 17 # 10-25).'
                : '¿El punto no es correcto? Toca el mapa donde está tu negocio. Puedes completar la dirección arriba (número, local).'}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Indicaciones (opcional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Ej. Entregar por la puerta de atrás, horario de 2 a 5 p. m."
        placeholderTextColor={Colors.onSurfaceVariant}
        multiline
        textAlignVertical="top"
      />

      {failed ? (
        <View style={{ marginTop: 24 }}>
          <ConnectionError compact message="Tu solicitud no se ha perdido. Intenta enviarla de nuevo." onRetry={handleSubmit} />
        </View>
      ) : (
        <GradientButton
          label={sending ? 'Enviando...' : 'Solicitar bidón'}
          onPress={handleSubmit}
          icon="barrel-outline"
          disabled={sending}
          style={{ marginTop: 28 }}
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 10,
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  optionHint: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 18,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: 16,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  quantity: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
    minWidth: 28,
    textAlign: 'center',
  },
  input: {
    minHeight: 52,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  notesInput: {
    minHeight: 96,
  },
  mapBox: {
    marginBottom: 12,
    gap: 8,
  },
  mapFrame: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  mapHint: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.onSurfaceVariant,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  locationButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
