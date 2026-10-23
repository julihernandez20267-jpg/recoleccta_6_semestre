import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, Text, View } from 'react-native';
import 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GuardianRoutesProvider } from '@/context/GuardianRoutesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { SafeAreaProvider } from 'react-native-safe-area-context';


export const unstable_settings = {
  anchor: 'splash',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { logout, user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutEnabled = !!user && user.role !== 'guardian';

  const { resetTimer, dismissWarning, countdown } = useSessionTimeout({
    onWarning: () => {
      setShowWarning(true);
    },
    onLogout: async () => {
      setShowWarning(false);
      await logout();
    },
    onResetTimer: () => {
      // Timer reiniciado
    },
  }, { enabled: timeoutEnabled });

  // Detectar interacción del usuario para resetear timer
  const handleUserInteraction = () => {
    if (timeoutEnabled && !showWarning) {
      resetTimer();
    }
  };

  // Monitorear cambios de estado de la app (foreground/background)
  useEffect(() => {
    if (!user || !timeoutEnabled) {
      return;
    }

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    function handleAppStateChange(state: any) {
      if (state === 'active') {
        // App vuelve al foreground - resetear timer
        resetTimer();
      }
    }

    return () => {
      appStateSubscription.remove();
    };
  }, [user, timeoutEnabled, resetTimer]);

  // Si el timeout está deshabilitado para guardian, ocultar cualquier modal activo.
  useEffect(() => {
    if (!timeoutEnabled && showWarning) {
      setShowWarning(false);
    }
  }, [timeoutEnabled, showWarning]);

  // Mostrar diálogo de inactividad
  useEffect(() => {
    if (!showWarning || !user) {
      return;
    }
  }, [showWarning, user, dismissWarning, logout]);

  // Guard de sesión: redirige al login cuando no hay usuario activo.
  useEffect(() => {
    if (loading) {
      return;
    }

    const currentRoot = segments[0];
    const inPublicScreen = currentRoot === 'login' || currentRoot === 'splash';

    if (!user && !inPublicScreen) {
      router.replace('/login');
      return;
    }

    if (user && inPublicScreen) {
      if (user.role === 'admin') {
        router.replace('/admin-panel');
      } else if (user.role === 'guardian') {
        router.replace('/guardian-panel');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [loading, router, segments, user]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }} onTouchStart={handleUserInteraction}>
        <Stack>
          <Stack.Screen name="splash" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="guardian-panel" options={{ headerShown: false }} />
          <Stack.Screen name="guardian-map" options={{ headerShown: false }} />
          <Stack.Screen name="guardian-list" options={{ headerShown: false }} />
          <Stack.Screen name="guardian-profile" options={{ headerShown: false }} />
          <Stack.Screen name="admin-panel" options={{ headerShown: false }} />
          <Stack.Screen name="admin-guardians" options={{ headerShown: false }} />
          <Stack.Screen name="admin-routes" options={{ headerShown: false }} />
          <Stack.Screen name="admin-create-guardian" options={{ headerShown: false }} />
          <Stack.Screen name="admin-roles" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="privacy" options={{ headerShown: false }} />
          <Stack.Screen name="support" options={{ headerShown: false }} />
          <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
          <Stack.Screen name="report-form" options={{ headerShown: false }} />
          <Stack.Screen name="report-detail/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </View>
      <StatusBar style="auto" />

      {/* Modal de advertencia de sesión expirada */}
      <Modal
        visible={showWarning && timeoutEnabled}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: 12,
              padding: 24,
              width: '80%',
              maxWidth: 380,
              alignItems: 'center',
            }}
          >
            <Text style={[Typography.titleMedium, { marginBottom: 12 }]}>
              ¿Sigues aquí?
            </Text>
            <Text
              style={[
                Typography.bodyMedium,
                {
                  marginBottom: 20,
                  textAlign: 'center',
                  color: Colors.onSurface,
                },
              ]}
            >
              Tu sesión se cerrará en: <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{countdown}s</Text>
            </Text>

            <Pressable
              onPress={() => {
                setShowWarning(false);
                dismissWarning();
              }}
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 32,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: 200,
              }}
            >
              <Text
                style={[
                  Typography.labelLarge,
                  {
                    color: Colors.onPrimary,
                  },
                ]}
              >
                Sí, continuar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GuardianRoutesProvider>
          <RootLayoutContent />
        </GuardianRoutesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
