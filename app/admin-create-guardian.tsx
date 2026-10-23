import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { createGuardian } from '@/services/api';

export default function AdminCreateGuardianScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Faltan datos', 'Completa nombre, correo y contraseña.');
      return;
    }

    setLoading(true);
    setApiFailed(false);
    try {
      const res = await createGuardian(email, password, name);
      if (res.success) {
        Alert.alert('Guardián creado', `${name} fue creado correctamente.`, [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      } else {
        throw new Error(res.message || 'Error al crear guardián.');
      }
    } catch (error: any) {
      const isNetworkError = !error.response || error.response.status >= 500;
      if (isNetworkError) {
        setApiFailed(true);
        Alert.alert('Error de API', 'El servidor no responde. No se puede guardar en este momento.');
      } else {
        Alert.alert('Error', error.message || 'No se pudo crear el guardián.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Nuevo guardián</Text>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>CREACIÓN</Text>
        <Text style={styles.title}>Agregar guardián</Text>
        <Text style={styles.subtitle}>Completa nombre, gmail y contraseña para registrar un nuevo guardián.</Text>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Mateo Rivera"
            placeholderTextColor={Colors.outline}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Gmail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="ejemplo@gmail.com"
            placeholderTextColor={Colors.outline}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Contraseña</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa la contraseña"
              placeholderTextColor={Colors.outline}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.passwordInput}
            />
            <TouchableOpacity onPress={() => setShowPassword((current) => !current)}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {apiFailed ? (
            <Text style={{ color: Colors.error, textAlign: 'center', marginVertical: 8, fontSize: 12 }}>
              Falla en el servidor API. No es posible crear guardianes.
            </Text>
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color={Colors.onPrimary} />
                  <Text style={styles.saveButtonText}>Crear guardián</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf5' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  topTitle: { fontSize: 16, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope' },
  content: { padding: 18, paddingBottom: 40 },
  label: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope' },
  subtitle: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 8, lineHeight: 18, marginBottom: 20 },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e8e3',
    padding: 16,
  },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: Colors.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.onSurface,
    marginBottom: 14,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
  },
  passwordInput: { flex: 1, fontSize: 14, color: Colors.onSurface, paddingVertical: 4 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: { color: Colors.onPrimary, fontSize: 14, fontWeight: '800' },
});
