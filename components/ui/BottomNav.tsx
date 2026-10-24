import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import React, { ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

type TabKey = 'home' | 'reports' | 'map' | 'profile' | 'guardians' | 'routes';
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type NavItem = { key: TabKey; label: string; icon: IconName; href: Href };

// Una sola barra inferior para toda la app; las opciones dependen del rol.
const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  user: [
    { key: 'home', label: 'Inicio', icon: 'home-outline', href: '/(tabs)' },
    { key: 'reports', label: 'Reportes', icon: 'file-document-multiple-outline', href: '/(tabs)/reports' },
    { key: 'profile', label: 'Perfil', icon: 'account-outline', href: '/(tabs)/profile' },
  ],
  guardian: [
    { key: 'home', label: 'Inicio', icon: 'home-outline', href: '/guardian-panel' },
    { key: 'map', label: 'Mapa', icon: 'map-outline', href: '/guardian-map' },
    { key: 'profile', label: 'Perfil', icon: 'account-outline', href: '/guardian-profile' },
  ],
  business: [
    { key: 'home', label: 'Inicio', icon: 'storefront-outline', href: '/business-panel' },
    { key: 'reports', label: 'Reportes', icon: 'file-document-multiple-outline', href: '/(tabs)/reports' },
    { key: 'profile', label: 'Perfil', icon: 'account-outline', href: '/(tabs)/profile' },
  ],
  admin: [
    { key: 'home', label: 'Inicio', icon: 'view-dashboard-outline', href: '/admin-panel' },
    { key: 'guardians', label: 'Guardianes', icon: 'account-hard-hat-outline', href: '/admin-guardians' },
    { key: 'routes', label: 'Rutas', icon: 'map-marker-path', href: '/admin-routes' },
    { key: 'profile', label: 'Perfil', icon: 'account-outline', href: '/(tabs)/profile' },
  ],
};

type BottomNavProps = {
  activeTab?: TabKey;
};

export function BottomNav({ activeTab }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const items = NAV_BY_ROLE[user?.role ?? 'user'];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 10 }]}>
      {items.map((item) => {
        const active = item.key === activeTab;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.item}
            onPress={() => !active && router.replace(item.href)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.iconPill, active && styles.iconPillActive]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={active ? Colors.primary : Colors.onSurfaceVariant}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconPill: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: 16,
  },
  iconPillActive: {
    backgroundColor: Colors.primaryFixed,
  },
  label: {
    color: Colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
