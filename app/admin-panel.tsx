import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { getRouteAssignments, getUsers, updateUserRole } from '@/services/api';

export default function AdminPanelScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setApiFailed(false);
    try {
      const [usersRes, assignmentsRes] = await Promise.all([
        getUsers(),
        getRouteAssignments(),
      ]);
      if (usersRes.success && usersRes.data?.users) {
        setUsers(usersRes.data.users);
      } else {
        throw new Error('Error al cargar usuarios');
      }
      if (assignmentsRes.success && assignmentsRes.data?.assignments) {
        setAssignments(assignmentsRes.data.assignments);
      }
    } catch (e) {
      setApiFailed(true);
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

  async function handleRoleChange(userId: number, role: string) {
    if (apiFailed) return;
    try {
      const res = await updateUserRole(userId, role);
      if (res.success) {
        Alert.alert('Éxito', 'Rol de usuario actualizado');
        loadData();
      } else {
        throw new Error(res.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el rol');
    }
  }

  const totalUsers = users.length;
  const citizenCount = users.filter(u => u.role === 'user').length;
  const guardianCount = users.filter(u => u.role === 'guardian').length;
  
  const assignedGuardianIds = new Set(assignments.map(a => a.guardianId));
  const guardiansWithoutRoute = users
    .filter(u => u.role === 'guardian' && !assignedGuardianIds.has(u.uid))
    .length;

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

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.label}>PANEL ADMINISTRATIVO</Text>
            <Text style={styles.mainTitle}>Supervisión general</Text>
          </View>

          {apiFailed ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color={Colors.error} />
              <Text style={styles.errorBannerText}>Falla de comunicación con la API. Mostrando datos fuera de línea.</Text>
              <TouchableOpacity style={styles.retryBtnSmall} onPress={loadData}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="account-multiple" size={28} color={Colors.primary} />
                <Text style={styles.statValue}>{totalUsers}</Text>
                <Text style={styles.statLabel}>Usuarios registrados</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialCommunityIcons name="account" size={28} color={Colors.primary} />
                <Text style={styles.statValue}>{citizenCount}</Text>
                <Text style={styles.statLabel}>Usuarios comunes</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialCommunityIcons name="shield-account" size={28} color={Colors.primary} />
                <Text style={styles.statValue}>{guardianCount}</Text>
                <Text style={styles.statLabel}>Guardianes</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialCommunityIcons name="alert-circle" size={28} color={Colors.error} />
                <Text style={styles.statValue}>{guardiansWithoutRoute}</Text>
                <Text style={styles.statLabel}>Guardianes sin ruta</Text>
              </View>
            </View>
          )}

          {!apiFailed && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin-roles')}>
                <MaterialCommunityIcons name="account-check" size={20} color={Colors.primary} />
                <Text style={styles.actionBtnText}>ROLES</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin-routes' as never)}>
                <MaterialCommunityIcons name="map-marker-path" size={20} color={Colors.primary} />
                <Text style={styles.actionBtnText}>RUTAS</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin-guardians')}>
                <MaterialCommunityIcons name="shield-account" size={20} color={Colors.primary} />
                <Text style={styles.actionBtnText}>GUARDIANES</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Gestión de usuarios y roles</Text>

          {users.slice(0, 4).map((u) => (
            <View key={u.uid} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{u.email}</Text>
                <Text style={styles.userID}>ID #{u.uid}</Text>
              </View>
              {!apiFailed && (
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[styles.roleBtn, u.role === 'user' ? styles.roleBtnActive : styles.roleBtnInactive]}
                    onPress={() => handleRoleChange(u.uid, 'user')}
                  >
                    <Text style={[styles.roleBtnText, u.role === 'user' && styles.roleBtnTextActive]}>USER</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, u.role === 'guardian' ? styles.roleBtnActive : styles.roleBtnInactive]}
                    onPress={() => handleRoleChange(u.uid, 'guardian')}
                  >
                    <Text style={[styles.roleBtnText, u.role === 'guardian' && styles.roleBtnTextActive]}>GUARDIAN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, u.role === 'admin' ? styles.roleBtnActive : styles.roleBtnInactive]}
                    onPress={() => handleRoleChange(u.uid, 'admin')}
                  >
                    <Text style={[styles.roleBtnText, u.role === 'admin' && styles.roleBtnTextActive]}>ADMIN</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/admin-panel')}>
          <MaterialCommunityIcons name="home" size={20} color={Colors.onPrimary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin-guardians')}>
          <MaterialCommunityIcons name="shield-account-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Guardianes</Text>
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
  content: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 },
  titleSection: { marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8, marginBottom: 8 },
  mainTitle: { fontSize: 28, fontWeight: '800', color: Colors.onSurface, fontFamily: 'Manrope' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e8e8e3',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.primary, marginTop: 8, fontFamily: 'Manrope' },
  statLabel: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 6,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface, marginBottom: 14, marginTop: 8 },
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e3',
  },
  userInfo: { marginBottom: 12 },
  userEmail: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  userID: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2 },
  roleButtons: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
  },
  roleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleBtnInactive: { backgroundColor: Colors.surface },
  roleBtnText: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.4 },
  roleBtnTextActive: { color: Colors.onPrimary },
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
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navItemActive: { backgroundColor: Colors.primary, borderRadius: 16, marginHorizontal: 4 },
  navLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, marginTop: 4, letterSpacing: 0.3 },
  navLabelActive: { color: Colors.onPrimary },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fde8e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f8b4b4',
    gap: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  retryBtnSmall: {
    backgroundColor: Colors.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
