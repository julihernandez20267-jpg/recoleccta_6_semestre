import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

type TabKey = 'home' | 'reports' | 'profile';

type BottomNavProps = {
  activeTab: TabKey;
};

export function BottomNav({ activeTab }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const goHome = () => {
    if (user?.role === 'guardian') {
      router.push('/guardian-panel');
      return;
    }
    router.push('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 10 }]}> 
      <TouchableOpacity style={styles.item} onPress={goHome} activeOpacity={0.85}>
        <MaterialIcons
          name="home"
          size={22}
          color={activeTab === 'home' ? Colors.primary : Colors.onSurfaceVariant}
        />
        <Text style={[styles.label, activeTab === 'home' && styles.labelActive]}>Inicio</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/(tabs)/reports')} activeOpacity={0.85}>
        <MaterialIcons
          name="bar-chart"
          size={22}
          color={activeTab === 'reports' ? Colors.primary : Colors.onSurfaceVariant}
        />
        <Text style={[styles.label, activeTab === 'reports' && styles.labelActive]}>Reportes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
        <MaterialIcons
          name="person"
          size={22}
          color={activeTab === 'profile' ? Colors.primary : Colors.onSurfaceVariant}
        />
        <Text style={[styles.label, activeTab === 'profile' && styles.labelActive]}>Perfil</Text>
      </TouchableOpacity>
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
    gap: 3,
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
