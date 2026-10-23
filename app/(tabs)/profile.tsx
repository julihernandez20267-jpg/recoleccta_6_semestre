import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../../components/ui/BottomNav';
import { Colors } from '../../constants/Colors';
import type { UserRole } from '../../types/auth';

type ProfilePreset = {
  roleLabel: string;
};

const PRESETS: Record<UserRole, ProfilePreset> = {
  user: {
    roleLabel: 'Usuario',
  },
  guardian: {
    roleLabel: 'Guardian',
  },
  admin: {
    roleLabel: 'Admin',
  },
};

function getDisplayName(email?: string, displayName?: string) {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  if (!email) {
    return 'Usuario Recoleccta';
  }

  const raw = email.split('@')[0] || 'usuario';
  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const role: UserRole = user?.role ?? 'user';
  const preset = PRESETS[role];
  const displayName = getDisplayName(user?.email, user?.displayName);
  const initials = (displayName?.charAt(0) || 'U').toUpperCase();

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  function handleEditProfile() {
    router.push('/profile-edit');
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

  function handleSettings() {
    router.push('/settings');
  }

  function handlePrivacy() {
    router.push('/privacy');
  }

  function handleSupport() {
    router.push('/support' as any);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.avatarWrap}>
            {user?.photoURL ? (
              <ExpoImage source={user.photoURL} style={styles.avatarImage} contentFit="cover" cachePolicy="none" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{initials}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.editBadge} activeOpacity={0.85} onPress={handlePhotoEdit}>
              <MaterialCommunityIcons name="camera" size={16} color={Colors.onPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{displayName}</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={handleEditProfile}>
              <MaterialCommunityIcons name="pencil" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileEmail}>{user?.email || 'usuario@recoleccta.com'}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{preset.roleLabel.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.88} onPress={handleSettings}>
            <View style={[styles.menuIconBox, styles.menuIconPrimary]}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={Colors.onPrimaryFixed} />
            </View>
            <Text style={styles.menuItemText}>Configuración</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.88} onPress={handlePrivacy}>
            <View style={[styles.menuIconBox, styles.menuIconSecondary]}>
              <MaterialCommunityIcons name="lock-outline" size={22} color={Colors.onSecondaryContainer} />
            </View>
            <Text style={styles.menuItemText}>Privacidad</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutItem} activeOpacity={0.9} onPress={handleLogout}>
          <View style={styles.logoutLeft}>
            <View style={styles.logoutIconBox}>
              <MaterialCommunityIcons name="logout" size={22} color="#93000a" />
            </View>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={22} color="#93000a" />
        </TouchableOpacity>

        <View style={styles.supportWrap}>
          <Text style={styles.versionText}>Recoleccta App v2.4.0</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={handleSupport}>
            <Text style={styles.supportText}>¿Necesitas ayuda? Contactar soporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingBottom: 122,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrap: {
    position: 'relative',
    width: 126,
    height: 126,
    borderRadius: 63,
    marginBottom: 14,
  },
  avatarImage: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 4,
    borderColor: Colors.surfaceContainerLowest,
  },
  avatarFallback: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 4,
    borderColor: Colors.surfaceContainerLowest,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.primary,
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 31,
    fontWeight: '800',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  profileEmail: {
    marginTop: 3,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  roleBadge: {
    marginTop: 10,
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.onSecondaryContainer,
  },
  menuGroup: {
    gap: 10,
  },
  menuItem: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconPrimary: {
    backgroundColor: Colors.primaryFixed,
  },
  menuIconSecondary: {
    backgroundColor: Colors.secondaryContainer,
  },
  menuItemText: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  logoutItem: {
    marginTop: 18,
    backgroundColor: '#ffdad6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 21,
    fontWeight: '700',
    color: '#93000a',
  },
  supportWrap: {
    marginTop: 22,
    marginBottom: 8,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  supportText: {
    marginTop: 5,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
