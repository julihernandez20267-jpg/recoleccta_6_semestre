import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../../components/ui/BottomNav';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';

function getGreeting(email?: string, displayName?: string) {
  const cleanDisplayName = displayName?.trim();
  if (cleanDisplayName) {
    return `Hola, ${cleanDisplayName}`;
  }

  if (!email) {
    return 'Hola de nuevo';
  }

  const namePart = email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'de nuevo';
  const normalized = namePart
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

  return `Hola, ${normalized}`;
}

export default function UserDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <MaterialIcons name="eco" size={24} color={Colors.primary} />
            <Text style={[Typography.headlineMd, styles.brandText]}>Recoleccta</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.iconButton}
              onPress={() => router.push('/notifications')}
            >
              <MaterialIcons name="notifications-none" size={22} color={Colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.avatarButton}
              onPress={() => router.push('/profile')}
            >
              {user?.photoURL ? (
                <ExpoImage
                  source={user.photoURL}
                  style={styles.avatarImage}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <MaterialIcons name="person" size={20} color={Colors.onSecondaryContainer} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient
          colors={[Colors.primary, Colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroIconWrap}>
            <MaterialIcons name="recycling" size={112} color="rgba(255,255,255,0.15)" />
          </View>
          <View style={styles.heroContent}>
            <Text style={[Typography.displaySm, styles.heroTitle]}>{getGreeting(user?.email, user?.displayName)}</Text>
            <Text style={[Typography.bodyMd, styles.heroSubtitle]}>
              Ayúdanos a mantener nuestra ciudad limpia. Si ves un contenedor lleno,
              repórtalo en segundos.
            </Text>
            {user?.role !== 'guardian' ? (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.heroButton}
                onPress={() => router.push('/report-form')}
              >
                <MaterialIcons name="room" size={18} color={Colors.primary} />
                <Text style={[Typography.titleMd, styles.heroButtonText]}>Reportar Punto Lleno</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.guardianHint}>
                <MaterialIcons name="info-outline" size={18} color={Colors.onPrimary} />
                <Text style={[Typography.bodyMd, styles.guardianHintText]}>
                  Accede a tu panel de guardian para gestionar rutas y puntos.
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View>
              <Text style={[Typography.labelLg, styles.statLabel]}>TUS REPORTES</Text>
              <Text style={[Typography.displayLg, styles.statValuePrimary]}>3</Text>
            </View>
            <View style={styles.statIconBox}>
              <MaterialIcons name="insert-chart" size={22} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.statCard}>
            <View>
              <Text style={[Typography.labelLg, styles.statLabel]}>PUNTOS ATENDIDOS</Text>
              <Text style={[Typography.displayLg, styles.statValueSecondary]}>2</Text>
            </View>
            <View style={styles.statIconBox}>
              <MaterialIcons name="check-circle" size={22} color={Colors.secondary} />
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomNav activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    color: Colors.primary,
    fontWeight: '800',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondaryContainer,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  heroCard: {
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: 'hidden',
    marginBottom: 14,
    minHeight: 220,
  },
  heroGlow: {
    position: 'absolute',
    right: -60,
    bottom: -88,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(163, 246, 156, 0.16)',
  },
  heroIconWrap: {
    position: 'absolute',
    right: 10,
    top: 34,
  },
  heroContent: {
    maxWidth: '76%',
    zIndex: 1,
  },
  heroTitle: {
    color: Colors.onPrimary,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: Colors.onPrimaryContainer,
    lineHeight: 20,
    marginBottom: 14,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 8,
  },
  heroButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  guardianHint: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  guardianHintText: {
    color: Colors.onPrimary,
    flex: 1,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  statValuePrimary: {
    color: Colors.primary,
    fontSize: 48,
    lineHeight: 50,
  },
  statValueSecondary: {
    color: Colors.secondary,
    fontSize: 48,
    lineHeight: 50,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
  },
});
