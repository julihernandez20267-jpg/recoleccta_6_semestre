import { BottomNav } from '@/components/ui/BottomNav';
import { ConnectionError } from '@/components/ui/ConnectionError';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { ROLE_LABELS, ROLE_SHORT_LABELS, roleLabel } from '../constants/Roles';
import type { UserRole } from '../types/auth';
import { getUsers, updateUserRole } from '@/services/api';

export default function AdminRolesScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<any[]>([]);
  const [apiFailed, setApiFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setApiFailed(false);
    try {
      const response = await getUsers();
      if (response.success && response.data?.users) {
        setUsers(response.data.users);
      } else {
        throw new Error('No se pudieron obtener los usuarios.');
      }
    } catch (error) {
      setApiFailed(true);
      Alert.alert('Sin conexión', 'No pudimos conectarnos con el servidor. Intenta de nuevo en un momento.');
    } finally {
      setLoading(false);
    }
  }

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

  const handleRoleChange = (userId: number, userEmail: string, newRole: string) => {
    if (apiFailed) {
      Alert.alert('Sin conexión', 'No pudimos conectarnos con el servidor. Intenta de nuevo en un momento.');
      return;
    }
    Alert.alert('Cambiar rol', `¿Cambiar el rol de ${userEmail} a ${roleLabel(newRole)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cambiar',
        style: 'default',
        onPress: async () => {
          try {
            const res = await updateUserRole(userId, newRole);
            if (res.success) {
              Alert.alert('Rol actualizado', 'El cambio de rol quedó guardado.');
              loadUsers();
            } else {
              throw new Error(res.message);
            }
          } catch (e: any) {
            Alert.alert('Error', e.message || 'No se pudo cambiar el rol.');
          }
        }
      },
    ]);
  };

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
        {/* Header Section */}
        <View style={styles.titleSection}>
          <Text style={styles.label}>ADMINISTRACIÓN</Text>
          <Text style={styles.mainTitle}>Asignación de roles</Text>
          <Text style={styles.subtitle}>Gestiona los permisos y acceso de tus usuarios.</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>Los roles determinan qué funciones puede acceder cada usuario en la plataforma.</Text>
        </View>

        {/* Role Legend */}
        <View style={styles.legendSection}>
          <Text style={styles.legendTitle}>Tipos de roles</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primaryFixedDim }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.legendItemTitle}>{ROLE_LABELS.user}</Text>
              <Text style={styles.legendItemDesc}>Acceso básico. Puede reportar puntos llenos y seguir sus reportes.</Text>
            </View>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primaryFixed }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.legendItemTitle}>{ROLE_LABELS.guardian}</Text>
              <Text style={styles.legendItemDesc}>Personal de campo. Recorre rutas y atiende reportes.</Text>
            </View>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.legendItemTitle}>{ROLE_LABELS.admin}</Text>
              <Text style={styles.legendItemDesc}>Control total del sistema y gestión de usuarios.</Text>
            </View>
          </View>
        </View>

        {/* Users List */}
        <Text style={styles.sectionTitle}>Usuarios del sistema</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : apiFailed ? (
          <ConnectionError compact onRetry={() => loadUsers()} />
        ) : users.length === 0 ? (
          <Text style={{ textAlign: 'center', color: Colors.onSurfaceVariant, marginTop: 20 }}>No hay usuarios en el sistema.</Text>
        ) : (
          users.map((user) => (
            <View key={user.uid} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userUID}>ID #{user.uid}</Text>
                </View>
                <View style={styles.currentRoleBadge}>
                  <Text style={styles.currentRoleBadgeText}>{roleLabel(user.role).toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.roleSelector}>
                {['user', 'guardian', 'admin'].map((role) => {
                  const isActive = role === user.role;
                  let roleColor = Colors.outline;
                  if (role === 'user') roleColor = Colors.primaryFixedDim;
                  else if (role === 'guardian') roleColor = Colors.primaryFixed;
                  else if (role === 'admin') roleColor = Colors.error;

                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        isActive && { backgroundColor: roleColor, borderColor: roleColor },
                      ]}
                      onPress={() => !isActive && handleRoleChange(user.uid, user.email, role)}
                    >
                      <Text style={[styles.roleButtonText, isActive && { color: Colors.onPrimary }]}>
                        {ROLE_SHORT_LABELS[role as UserRole]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <BottomNav activeTab="home" />
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
  content: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 },
  titleSection: { marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8, marginBottom: 8 },
  mainTitle: { fontSize: 28, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope', marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 18 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryFixedDim,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: { fontSize: 12, color: Colors.onPrimaryFixed, flex: 1, lineHeight: 18 },
  legendSection: { marginBottom: 28 },
  legendTitle: { fontSize: 13, fontWeight: '800', color: Colors.onSurface, marginBottom: 12, fontFamily: 'Manrope' },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  legendDot: { width: 16, height: 16, borderRadius: 8, marginTop: 2 },
  legendItemTitle: { fontSize: 12, fontWeight: '700', color: Colors.onSurface },
  legendItemDesc: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2, lineHeight: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface, marginBottom: 12, marginTop: 8 },
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e3',
  },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  userEmail: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  userUID: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  currentRoleBadge: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  currentRoleBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.onPrimary, letterSpacing: 0.3 },
  roleSelector: { flexDirection: 'row', gap: 8 },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  roleButtonText: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.3 },
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
  navLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, marginTop: 4, letterSpacing: 0.3 },
});

