import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tus datos en Recoleccta</Text>
          <Text style={styles.cardText}>Usamos tu correo y tu nombre de perfil para identificar tus reportes y mostrarte actualizaciones en la app.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ubicación del reporte</Text>
          <Text style={styles.cardText}>La ubicación solo se guarda para enrutar la recolección del punto reportado.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evidencias</Text>
          <Text style={styles.cardText}>Las imágenes adjuntas se usan para validar el estado del punto de reciclaje.</Text>
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginBottom: 6 },
  cardText: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 20 },
});
