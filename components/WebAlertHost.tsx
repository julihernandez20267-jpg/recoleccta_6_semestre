import React, { useEffect, useState } from 'react';
import { AlertButton, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { subscribeWebAlerts, WebAlertRequest } from '../services/webAlert';

// Dibuja los Alert.alert de la app cuando corre en el navegador (ver services/webAlert.ts).
export function WebAlertHost() {
  const [queue, setQueue] = useState<WebAlertRequest[]>([]);

  useEffect(() => subscribeWebAlerts((request) => setQueue((current) => [...current, request])), []);

  const current = queue[0];
  if (!current) return null;

  function handlePress(button: AlertButton) {
    setQueue((items) => items.slice(1));
    button.onPress?.();
  }

  // El botón de cancelar va primero (a la izquierda), como en Android.
  const buttons = [...current.buttons].sort(
    (a, b) => Number(b.style === 'cancel') - Number(a.style === 'cancel'),
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => handlePress(buttons[0])}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={styles.buttons}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  onPress={() => handlePress(button)}
                  style={[
                    styles.button,
                    isCancel ? styles.buttonGhost : isDestructive ? styles.buttonDanger : styles.buttonPrimary,
                  ]}
                >
                  <Text style={[styles.buttonText, isCancel && { color: Colors.onSurface }]}>{button.text ?? 'Aceptar'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 22,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonDanger: {
    backgroundColor: Colors.error,
  },
  buttonGhost: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
});
