import { BottomNav } from '@/components/ui/BottomNav';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

const FAQ_ITEMS = [
  {
    question: '¿Cómo programar una recolección especial?',
    answer: 'Entra a Reportes y crea un nuevo reporte con ubicación y evidencia. Si es urgente, usa la opción Llámanos.',
  },
  {
    question: '¿Qué materiales son reciclables?',
    answer: 'Puedes reportar plástico, papel, vidrio y orgánico. En cada reporte selecciona el tipo para mejorar la ruta.',
  },
  {
    question: 'Mi recolección no ha pasado, ¿qué hago?',
    answer: 'Revisa el estado en Historial de reportes. Si sigue pendiente, escríbenos al correo de soporte.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  async function openPhone() {
    const url = 'tel:+34900123456';
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  }

  async function openEmail() {
    const url = 'mailto:hola@recoleccta.eco?subject=Soporte%20Recoleccta';
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
          <TouchableOpacity style={styles.contactCard} activeOpacity={0.92} onPress={() => void openPhone()}>
            <View style={styles.contactTopRow}>
              <View style={styles.contactIconWrap}>
                <MaterialCommunityIcons name="phone" size={26} color={Colors.primary} />
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={24} color={Colors.onSurfaceVariant} />
            </View>
            <Text style={styles.contactTitle}>Llamanos</Text>
            <Text style={styles.contactSubtitle}>Atencion de lunes a viernes de 8:00 a 18:00.</Text>
            <Text style={styles.contactValue}>+34 900 123 456</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} activeOpacity={0.92} onPress={() => void openEmail()}>
            <View style={styles.contactTopRow}>
              <View style={styles.contactIconWrap}>
                <MaterialCommunityIcons name="email-outline" size={26} color={Colors.primary} />
              </View>
              <MaterialCommunityIcons name="arrow-top-right" size={24} color={Colors.onSurfaceVariant} />
            </View>
            <Text style={styles.contactTitle}>Escribenos</Text>
            <Text style={styles.contactSubtitle}>Responderemos a tu solicitud en menos de 24 horas habiles.</Text>
            <Text style={styles.contactValue}>hola@recoleccta.eco</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.faqBlock}>
          <Text style={styles.faqTitle}>Preguntas frecuentes</Text>
          <Text style={styles.faqSubtitle}>Encuentra soluciones rapidas a dudas comunes.</Text>

          <TouchableOpacity style={styles.helpButton} activeOpacity={0.9}>
            <Text style={styles.helpButtonText}>Ver Centro de Ayuda</Text>
            <MaterialCommunityIcons name="open-in-new" size={18} color={Colors.onPrimary} />
          </TouchableOpacity>

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
    fontSize: 40,
    lineHeight: 43,
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
    borderRadius: 28,
    padding: 20,
    minHeight: 220,
    justifyContent: 'space-between',
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
    fontSize: 30,
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
    marginTop: 10,
    fontSize: 24,
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
    fontSize: 34,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  faqSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 14,
  },
  helpButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  helpButtonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
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
