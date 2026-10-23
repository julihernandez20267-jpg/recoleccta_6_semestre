import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { getReports } from '@/services/api';

function getDisplayName(email?: string, displayName?: string) {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  if (!email) {
    return 'Guardian Recoleccta';
  }

  const raw = email.split('@')[0] || 'guardian';
  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

export default function GuardianProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'guardian') {
        loadReports();
      } else {
        setLoading(false);
        if (user.role === 'admin') {
          router.replace('/admin-panel');
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user]);

  async function loadReports() {
    if (!user || user.role !== 'guardian') return;
    setLoading(true);
    setApiFailed(false);
    try {
      const res = await getReports();
      if (res.success && res.data?.reports) {
        setReports(res.data.reports);
      } else {
        throw new Error('Error al cargar reportes');
      }
    } catch (e) {
      setApiFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const displayName = getDisplayName(user?.email, user?.displayName);
  const initials = (displayName?.charAt(0) || 'G').toUpperCase();

  const activeCount = loading ? '-' : reports.filter(
    (item) => item.status === 'in-progress' && item.assigned_guardian_id === user?.uid
  ).length;
  const pendingCount = loading ? '-' : reports.filter((item) => item.status === 'pending').length;
  const completedCount = loading ? '-' : reports.filter(
    (item) => item.status === 'completed' && item.assigned_guardian_id === user?.uid
  ).length;

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro de cerrar tu cuenta?', [
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

  async function handlePhotoEdit() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a tu galería para cambiar la foto de perfil');
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
        const photo = result.assets[0];
        const base64Data = `data:image/jpeg;base64,${photo.base64}`;
        await updateProfile({ photoURL: base64Data });
        Alert.alert('Éxito', 'Foto de perfil actualizada');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la foto de perfil');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="leaf" size={22} color={Colors.primary} />
          <Text style={styles.brandText}>Recoleccta</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
          <MaterialCommunityIcons name="bell-outline" size={19} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            {user?.photoURL ? (
              <ExpoImage source={user.photoURL} style={styles.avatarImage} contentFit="cover" cachePolicy="none" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge} activeOpacity={0.85} onPress={handlePhotoEdit}>
              <MaterialCommunityIcons name="camera" size={14} color={Colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email || 'guardian@recoleccta.com'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>GUARDIAN OPERATIVO</Text>
          </View>
        </View>

        {apiFailed && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={Colors.error} />
            <Text style={styles.errorBannerText}>Falla de API. Estadísticas fuera de línea.</Text>
            <TouchableOpacity onPress={loadReports} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.metricValue}>{activeCount}</Text>}
            <Text style={styles.metricLabel}>Activas</Text>
          </View>
          <View style={styles.metricCard}>
            {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.metricValue}>{pendingCount}</Text>}
            <Text style={styles.metricLabel}>Pendientes</Text>
          </View>
          <View style={styles.metricCard}>
            {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.metricValue}>{completedCount}</Text>}
            <Text style={styles.metricLabel}>Completadas</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/guardian-list')}>
          <MaterialCommunityIcons name="clipboard-list-outline" size={20} color={Colors.primary} />
          <Text style={styles.menuText}>Ver reportes disponibles</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/guardian-map')}>
          <MaterialCommunityIcons name="map-outline" size={20} color={Colors.primary} />
          <Text style={styles.menuText}>Abrir mapa operativo</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#93000a" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}> 
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/guardian-panel')}>
          <MaterialCommunityIcons name="home-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/guardian-map')}>
          <MaterialCommunityIcons name="map-outline" size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.navLabel}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/guardian-profile')}>
          <MaterialCommunityIcons name="account" size={20} color={Colors.onPrimary} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafaf5' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#fafaf5',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ebe5',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.6,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf2ec',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 130,
    gap: 12,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dce4d8',
    padding: 18,
  },
  avatarWrap: {
    position: 'relative',
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 10,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.primary,
  },
  name: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  email: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  roleBadge: {
    marginTop: 10,
    backgroundColor: Colors.primaryFixed,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#1b5b1f',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#dce4d8',
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  menuItem: {
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#dce4d8',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  logoutButton: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#ffdad6',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#93000a',
  },
  bottomNav: {
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250,250,245,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e7ece4',
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  navItemActive: {
    backgroundColor: Colors.primary,
  },
  navLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
  },
  navLabelActive: {
    color: Colors.onPrimary,
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  errorBannerText: {
    color: '#c62828',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#c62828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
