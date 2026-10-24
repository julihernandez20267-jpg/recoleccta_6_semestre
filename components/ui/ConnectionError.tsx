import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';

type ConnectionErrorProps = {
  onRetry: () => void;
  message?: string;
  // compact: tarjeta dentro de una pantalla; si no, ocupa el espacio disponible centrado.
  compact?: boolean;
};

export const CONNECTION_HINT =
  'Revisa tu conexión a internet. Si nadie ha usado la app en un rato, el servidor puede tardar hasta un minuto en despertar.';

export function ConnectionError({ onRetry, message = CONNECTION_HINT, compact = false }: ConnectionErrorProps) {
  return (
    <View style={compact ? styles.card : styles.full}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="wifi-off" size={compact ? 22 : 32} color={Colors.error} />
      </View>
      <Text style={styles.title}>No pudimos conectarnos</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.85}>
        <MaterialCommunityIcons name="refresh" size={18} color={Colors.onPrimary} />
        <Text style={styles.buttonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.errorContainer,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  button: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
});
