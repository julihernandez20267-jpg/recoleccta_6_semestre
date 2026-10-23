import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { getUsers } from '@/services/api';

export default function AdminGuardiansScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [guardians, setGuardians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    loadGuardians();
  }, []);

  async function loadGuardians() {
    setLoading(true);
    setApiFailed(false);
    try {
      const response = await getUsers();
      if (response.success && response.data?.users) {
        const list = response.data.users.filter((u: any) => u.role === 'guardian');
        setGuardians(list);
      } else {
        throw new Error('Error al cargar.');
      }
    } catch (error) {
      setApiFailed(true);
      Alert.alert('Error de conexión', 'No se pudieron cargar los guardianes del servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesion', 'Estas seguro?', [
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="leaf" size={24} color={Colors.primary} />
          <Text style={styles.brandText}>Recoleccta</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.label}>GESTION</Text>
          <Text style={styles.mainTitle}>Guardianes</Text>
          <Text style={styles.subtitle}>
            Ver el listado de guardianes registrados. Las contraseñas están protegidas mediante cifrado.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : apiFailed ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={32} color={Colors.error} />
            <Text style={styles.errorText}>No se pudieron cargar los guardianes debido a una falla en la API.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadGuardians}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : guardians.length === 0 ? (
          <Text style={{ textAlign: 'center', color: Colors.onSurfaceVariant, marginTop: 20 }}>No hay guardianes registrados.</Text>
        ) : (
          <View style={styles.guardiansList}>
            {guardians.map((guardian) => {
              const name = guardian.displayName || guardian.email.split('@')[0];
              return (
                <View key={guardian.uid} style={styles.guardianCard}>
                  <View style={styles.guardianTopRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.guardianName}>{name}</Text>
                  <Text style={styles.guardianEmail}>{guardian.email}</Text>

                  <View style={styles.passwordBox}>
                    <Text style={styles.passwordLabel}>Contraseña</Text>
                    <Text style={styles.passwordValue}>••••••••</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {!apiFailed && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/admin-create-guardian' as never)}>
          <MaterialCommunityIcons name="plus" size={28} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin-panel')}>
          <MaterialCommunityIcons name="home" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/admin-guardians')}>
          <MaterialCommunityIcons name="shield-account" size={20} color={Colors.onPrimary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Guardianes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin-routes' as never)}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Rutas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile-edit')}>
          <MaterialCommunityIcons name="account-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf5' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fafaf5',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 20, fontWeight: '800', color: Colors.primary, fontFamily: 'Manrope' },
  content: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 120 },
  titleSection: { marginBottom: 18 },
  label: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8, marginBottom: 8 },
  mainTitle: { fontSize: 28, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope', marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 18 },
  guardiansList: { gap: 12 },
  guardianCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e8e3',
  },
  guardianTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: Colors.onPrimaryFixed, fontFamily: 'Manrope' },
  eyeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  guardianName: { fontSize: 16, fontWeight: '800', color: Colors.onSurface, marginTop: 12, fontFamily: 'Manrope' },
  guardianEmail: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 4 },
  passwordBox: {
    marginTop: 14,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  passwordLabel: { fontSize: 10, fontWeight: '800', color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  passwordValue: { fontSize: 13, fontWeight: '700', color: Colors.onSurface, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(250, 250, 245, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(191, 202, 186, 0.2)',
    paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  navItemActive: { backgroundColor: Colors.primary, borderRadius: 16, marginHorizontal: 4 },
  navLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, marginTop: 4, letterSpacing: 0.3 },
  navLabelActive: { color: Colors.onPrimary },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e3',
  },
  errorText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
