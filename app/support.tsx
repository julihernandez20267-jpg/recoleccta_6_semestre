import { BottomNav } from '@/components/ui/BottomNav';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { SUPPORT_EMAIL, SUPPORT_HOURS, SUPPORT_PHONE } from '../constants/Support';

const FAQ_ITEMS = [
  {
    question: '¿Cómo reporto un punto lleno?',
    answer: 'En Inicio toca "Reportar punto lleno", marca la ubicación en el mapa, elige el tipo de residuo y, si quieres, agrega una foto. Luego toca "Enviar reporte".',
  },
  {
    question: '¿Qué significa el estado de mi reporte?',
    answer: 'Pendiente: aún nadie lo ha tomado. En proceso: un guardián va en camino o lo está atendiendo. Atendido: el punto ya fue recolectado.',
  },
  {
    question: '¿Qué tipos de residuos puedo reportar?',
    answer: 'Plástico, papel, vidrio y orgánico. Elegir el tipo correcto ayuda a planear mejor las rutas de recolección.',
  },
  {
    question: '¿Quiénes son los guardianes?',
    answer: 'Son el personal de recolección. Reciben rutas del administrador y atienden los reportes que hacen los ciudadanos.',
  },
  {
    question: 'La app tarda en cargar, ¿es normal?',
    answer: 'Si nadie la ha usado en un rato, el servidor puede tardar hasta un minuto en despertar. Después de eso responde con normalidad.',
  },
  {
    question: 'Olvidé mi contraseña, ¿qué hago?',
    answer: 'En la pantalla de inicio de sesión toca "Olvidé mi contraseña". Te enviaremos un código a tu correo para crear una nueva.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  async function openPhone() {
    const url = `tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  }

  async function openEmail() {
    const url = `mailto:${SUPPORT_EMAIL}?subject=Soporte%20Recoleccta`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Soporte</Text>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Estamos para ayudarte.</Text>
          <Text style={styles.heroSubtitle}>
            Si tienes dudas sobre tu recolección o quieres reportar algo, elige el canal que prefieras.
          </Text>
        </View>

        <View style={styles.contactGrid}>
          {SUPPORT_PHONE ? (
          <TouchableOpacity style={styles.contactCard} activeOpacity={0.92} onPress={() => void openPhone()}>
            <View style={styles.contactTopRow}>
              <View style={styles.contactIconWrap}>
                <MaterialCommunityIcons name="phone" size={26} color={Colors.primary} />
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={24} color={Colors.onSurfaceVariant} />
            </View>
            <Text style={styles.contactTitle}>Llámanos</Text>
            <Text style={styles.contactSubtitle}>{SUPPORT_HOURS}</Text>
            <Text style={styles.contactValue}>{SUPPORT_PHONE}</Text>
          </TouchableOpacity>
          ) : null}

          {SUPPORT_EMAIL ? (
          <TouchableOpacity style={styles.contactCard} activeOpacity={0.92} onPress={() => void openEmail()}>
            <View style={styles.contactTopRow}>
              <View style={styles.contactIconWrap}>
                <MaterialCommunityIcons name="email-outline" size={26} color={Colors.primary} />
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={24} color={Colors.onSurfaceVariant} />
            </View>
            <Text style={styles.contactTitle}>Escríbenos</Text>
            <Text style={styles.contactSubtitle}>Responderemos tu solicitud en menos de 24 horas hábiles.</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.faqBlock}>
          <Text style={styles.faqTitle}>Preguntas frecuentes</Text>
          <Text style={styles.faqSubtitle}>Encuentra respuestas rápidas a las dudas más comunes.</Text>

          <View style={styles.faqList}>
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <TouchableOpacity
                  key={item.question}
                  style={styles.faqItem}
                  activeOpacity={0.9}
                  onPress={() => setOpenFaq((current) => (current === index ? null : index))}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <MaterialCommunityIcons
                      name={isOpen ? 'minus' : 'plus'}
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  {isOpen ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
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
  content: {
    paddingHorizontal: 18,
    paddingBottom: 122,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
  },
  contactGrid: {
    gap: 12,
    marginBottom: 22,
  },
  contactCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 18,
    gap: 4,
  },
  contactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 6,
  },
  contactSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  contactValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  faqBlock: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  faqSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 14,
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 14,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  faqAnswer: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
  },
});
