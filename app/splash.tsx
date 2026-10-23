import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

export default function SplashScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 6800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(1500),
        Animated.timing(progress, {
          toValue: 0,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [progress]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role === 'admin') {
      router.replace('/admin-panel');
      return;
    }

    if (user.role === 'guardian') {
      router.replace('/guardian-panel');
      return;
    }

    router.replace('/(tabs)');
  }, [loading, router, user]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['15%', '88%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.patternLayer} />
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />

      <View style={[styles.centerContent, { paddingTop: insets.top + 16 }]}>
        <View style={styles.logoWrap}>
          <MaterialCommunityIcons name="recycle" size={80} color={Colors.primary} />
        </View>

        <Text style={styles.brand}>Recoleccta</Text>
        <Text style={styles.tagline}>Por un futuro mas limpio</Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: barWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf5',
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
    backgroundColor: '#fafaf5',
  },
  decorTop: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(163,246,156,0.25)',
  },
  decorBottom: {
    position: 'absolute',
    bottom: -90,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(210,233,244,0.38)',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },

  logoWrap: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1a1c19',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 8,
  },
  brand: {
    marginTop: 38,
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop: 8,
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressTrack: {
    marginTop: 66,
    width: 188,
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
});
