import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../components/ui/BottomNav';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { useAuth } from '../context/AuthContext';

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  time: string;
};

const notificationsByRole: Record<'user' | 'guardian' | 'admin', NotificationItem[]> = {
  user: [
    { id: 1, title: 'Reporte recibido', body: 'Tu reporte fue registrado correctamente y esta pendiente de atencion.', time: 'Hace 5 min' },
    { id: 2, title: 'Recolector asignado', body: 'Un guardian fue asignado al punto que reportaste.', time: 'Hace 22 min' },
    { id: 3, title: 'Estado actualizado', body: 'Uno de tus reportes cambio a En Proceso.', time: 'Hace 1 h' },
  ],
  guardian: [
    { id: 1, title: 'Nueva ruta asignada', body: 'Tienes una nueva ruta operativa para hoy.', time: 'Hace 5 min' },
    { id: 2, title: 'Nuevo reporte cercano', body: 'Se reporto un punto de reciclaje en tu sector.', time: 'Hace 18 min' },
    { id: 3, title: 'Recordatorio', body: 'Marca los puntos completados desde el mapa.', time: 'Hace 1 h' },
  ],
  admin: [
    { id: 1, title: 'Nueva asignacion pendiente', body: 'Hay recolectores disponibles esperando ruta.', time: 'Hace 8 min' },
    { id: 2, title: 'Reporte escalado', body: 'Un punto pendiente lleva mas tiempo del esperado.', time: 'Hace 35 min' },
    { id: 3, title: 'Actividad del sistema', body: 'Se registraron nuevos reportes en Girardot.', time: 'Hace 1 h' },
  ],
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = user?.role ?? 'user';
  const notifications = notificationsByRole[role];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={[Typography.headlineSm, { color: Colors.onSurface }]}>Notificaciones</Text>
          <View style={{ width: 40 }} />
        </View>

        {notifications.map((item) => (
          <SurfaceCard key={item.id} level={1} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="bell-ring-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.titleSm, { color: Colors.onSurface }]}>{item.title}</Text>
                <Text style={[Typography.bodyMd, { color: Colors.onSurfaceVariant, marginTop: 4 }]}>{item.body}</Text>
                <Text style={[Typography.bodySm, { color: Colors.onSurfaceVariant, marginTop: 8 }]}>{item.time}</Text>
              </View>
            </View>
          </SurfaceCard>
        ))}
      </ScrollView>
      {role !== 'admin' && <BottomNav activeTab="profile" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 120,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
});