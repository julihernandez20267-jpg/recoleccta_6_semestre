import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';

export default function ProfileEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();

  const initialName = useMemo(() => {
    if (user?.displayName?.trim()) {
      return user.displayName.trim();
    }
    if (!user?.email) {
      return '';
    }
    return user.email.split('@')[0] ?? '';
  }, [user?.displayName, user?.email]);

  const [name, setName] = useState(initialName);
  const [photoBase64, setPhotoBase64] = useState<string | null>(user?.photoURL || null);
  const [saving, setSaving] = useState(false);

  const initials = (initialName?.charAt(0) || 'U').toUpperCase();

  async function pickImage() {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar la foto de perfil.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Data = `data:image/jpeg;base64,${asset.base64}`;
        setPhotoBase64(base64Data);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  }

  async function handleSave() {
    const clean = name.trim();
    if (!clean) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para guardar tu perfil.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({ 
        displayName: clean,
        photoURL: photoBase64 || undefined
      });
      Alert.alert('Perfil actualizado', 'Tus cambios fueron guardados correctamente.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar la información del perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
      </View>

      <View style={styles.formCard}>
        {/* Photo Upload Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarTouch} activeOpacity={0.85}>
            {photoBase64 ? (
              <ExpoImage source={photoBase64} style={styles.avatarImage} contentFit="cover" cachePolicy="none" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{initials}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHelpText}>Toca para cambiar foto</Text>
        </View>

        <Text style={styles.label}>Nombre visible</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Escribe tu nombre"
          placeholderTextColor={Colors.onSurfaceVariant}
          editable={!saving}
        />

        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={() => void handleSave()} disabled={saving} activeOpacity={0.9}>
          <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      </View>
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
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  avatarTouch: {
    position: 'relative',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  avatarHelpText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  label: { fontSize: 13, color: Colors.onSurfaceVariant, marginBottom: 8, fontWeight: '700' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    color: Colors.onSurface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 13,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
});

