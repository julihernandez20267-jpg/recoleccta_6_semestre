import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

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
            <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} trackColor={{ true: Colors.primaryContainer }} thumbColor={alertsEnabled ? Colors.primary : '#f4f3f4'} />
          </View>
          <Text style={styles.rowHelp}>Recibe avisos cuando cambie el estado de tus reportes.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>Notificaciones por correo</Text>
            <Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ true: Colors.primaryContainer }} thumbColor={emailEnabled ? Colors.primary : '#f4f3f4'} />
          </View>
          <Text style={styles.rowHelp}>Enviaremos actualizaciones importantes a tu email.</Text>
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
