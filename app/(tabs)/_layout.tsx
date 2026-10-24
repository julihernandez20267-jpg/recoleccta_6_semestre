import { Tabs } from 'expo-router';
import React from 'react';

// La barra de pestañas nativa va oculta: cada pantalla dibuja su propia barra inferior (BottomNav).
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reportes' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
