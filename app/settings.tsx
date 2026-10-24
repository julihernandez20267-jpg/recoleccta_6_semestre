import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  // Las preferencias se guardan en el teléfono, una por cuenta.
  const storageKey = `recoleccta.settings.v1.${user?.uid ?? 'anon'}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setAlertsEnabled(saved.alertsEnabled ?? true);
        setEmailEnabled(saved.emailEnabled ?? true);
      })
      .catch(() => {});
  }, [storageKey]);

  function save(next: { alertsEnabled: boolean; emailEnabled: boolean }) {
    setAlertsEnabled(next.alertsEnabled);
    setEmailEnabled(next.emailEnabled);
    AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Alertas en la app</Text>
            <Switch value={alertsEnabled} onValueChange={(value) => save({ alertsEnabled: value, emailEnabled })} trackColor={{ true: Colors.primaryContainer }} thumbColor={alertsEnabled ? Colors.primary : '#f4f3f4'} />
          </View>
          <Text style={styles.rowHelp}>Recibe avisos cuando cambie el estado de tus reportes.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Notificaciones por correo</Text>
            <Switch value={emailEnabled} onValueChange={(value) => save({ alertsEnabled, emailEnabled: value })} trackColor={{ true: Colors.primaryContainer }} thumbColor={emailEnabled ? Colors.primary : '#f4f3f4'} />
          </View>
          <Text style={styles.rowHelp}>Enviaremos actualizaciones importantes a tu correo.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.onSurface },
  content: { paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  rowHelp: { marginTop: 6, fontSize: 13, color: Colors.onSurfaceVariant },
});
