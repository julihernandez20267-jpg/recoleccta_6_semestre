import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { ComponentProps, PropsWithChildren } from 'react';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Colors } from '../constants/Colors';

type AppShellProps = PropsWithChildren<{ onTouchStart?: () => void }>;

const FRAME_WIDTH = 440;
// A partir de este ancho cabe el panel de presentación al lado de la app.
const WIDE_BREAKPOINT = 1000;
// Por debajo de este ancho (celular en el navegador) la app ocupa toda la pantalla.
const PHONE_BREAKPOINT = 560;

const FEATURES: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; text: string }[] = [
  { icon: 'map-marker-alert-outline', text: 'Reporta contenedores llenos en segundos' },
  { icon: 'truck-outline', text: 'Rutas de recolección para los guardianes' },
  { icon: 'storefront-outline', text: 'Recolección prioritaria y de aceite para comercios' },
  { icon: 'chart-box-outline', text: 'Seguimiento en tiempo real de cada reporte' },
];

// En el celular la app ocupa toda la pantalla. En el navegador de un computador se muestra
// dentro de un marco sobre un fondo de la marca, con un panel de presentación al lado.
export function AppShell({ children, onTouchStart }: AppShellProps) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web' || width < PHONE_BREAKPOINT) {
    return (
      <View style={{ flex: 1 }} onTouchStart={onTouchStart}>
        {children}
      </View>
    );
  }

  const wide = width >= WIDE_BREAKPOINT;

  return (
    <LinearGradient
      colors={['#e8f5e9', '#d7ecd9', '#cfe5ee']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <View style={styles.row}>
        {wide ? (
          <View style={styles.brandPanel}>
            <View style={styles.logoWrap}>
              <Image source={require('../assets/images/icon.png')} style={styles.logo} />
            </View>
            <Text style={styles.brandName}>Recoleccta</Text>
            <Text style={styles.tagline}>Gestión inteligente de residuos y reciclaje para Girardot.</Text>
            <View style={styles.features}>
              {FEATURES.map((feature) => (
                <View key={feature.text} style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <MaterialCommunityIcons name={feature.icon} size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
            <View style={styles.platforms}>
              <MaterialCommunityIcons name="android" size={18} color={Colors.onSurfaceVariant} />
              <MaterialCommunityIcons name="web" size={18} color={Colors.onSurfaceVariant} />
              <Text style={styles.platformsText}>Disponible en Android y en la web</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.frame} onTouchStart={onTouchStart}>
          {children}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTop: {
    width: 520,
    height: 520,
    top: -180,
    left: -140,
    backgroundColor: 'rgba(125, 213, 111, 0.25)',
  },
  glowBottom: {
    width: 600,
    height: 600,
    bottom: -260,
    right: -180,
    backgroundColor: 'rgba(47, 109, 133, 0.15)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 72,
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  brandPanel: {
    width: 380,
    gap: 14,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(31, 111, 58, 0.18)',
  },
  logo: {
    width: 64,
    height: 64,
  },
  brandName: {
    fontSize: 46,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 19,
    lineHeight: 27,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  features: {
    gap: 12,
    marginTop: 10,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: Colors.onSurface,
  },
  platforms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  platformsText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  frame: {
    width: FRAME_WIDTH,
    height: '100%',
    maxHeight: 920,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    boxShadow: '0 24px 60px rgba(20, 60, 30, 0.22)',
  },
});
