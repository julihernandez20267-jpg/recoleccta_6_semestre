import { useAuth } from '@/context/AuthContext';
import { loginUser, registerUser, requestPasswordRecovery, resetPasswordWithOTP } from '@/services/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { BUSINESS_TYPES, homeRouteFor } from '../constants/Roles';

type Mode = 'login' | 'register' | 'recover' | 'reset';

const ACCOUNT_OPTIONS = [
  { key: 'user', title: 'Ciudadano', hint: 'Reporto puntos llenos', icon: 'account-outline' },
  { key: 'business', title: 'Comercio', hint: 'Restaurante, taller, gasolinera', icon: 'storefront-outline' },
] as const;

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'business'>('user');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP Recovery states
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y tu contraseña.');
      return;
    }
    if (mode === 'register') {
      if (name.trim().length < 2) {
        Alert.alert('Nombre requerido', 'Escribe tu nombre para crear la cuenta.');
        return;
      }
      if (accountType === 'business' && (businessName.trim().length < 2 || !businessType)) {
        Alert.alert('Datos del comercio', 'Escribe el nombre del negocio y elige qué tipo de comercio es.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        Alert.alert('Correo inválido', 'Revisa que el correo esté bien escrito.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const session = await loginUser(email, password);
        await login(session);
        router.replace(homeRouteFor(session.user.role));
      } else {
        // Después de crear la cuenta se vuelve a "Iniciar sesión" con el correo ya escrito.
        const business = accountType === 'business' ? { name: businessName, type: businessType, phone } : undefined;
        await registerUser(email, password, name, business);
        setMode('login');
        setPassword('');
        Alert.alert(
          'Cuenta creada',
          accountType === 'business'
            ? 'Tu comercio quedó registrado. Ahora inicia sesión con tu correo y contraseña.'
            : 'Tu cuenta quedó creada. Ahora inicia sesión con tu correo y contraseña.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al autenticar.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOTP() {
    if (!email.trim()) {
      Alert.alert('Correo requerido', 'Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordRecovery(email);
      Alert.alert(
        'Código enviado',
        'Se ha enviado un código de recuperación alfanumérico a tu correo.'
      );
      setMode('reset');
      setOtpCode('');
      setNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar el código.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim() || !otpCode.trim() || !newPassword.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa el correo, código OTP y nueva contraseña.');
      return;
    }

    if (otpCode.trim().length !== 6) {
      Alert.alert('Código inválido', 'El código OTP debe ser de 6 caracteres.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña nueva debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOTP(email, otpCode, newPassword);
      Alert.alert(
        'Contraseña restablecida',
        'Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión.'
      );
      setMode('login');
      setPassword('');
      setNewPassword('');
      setOtpCode('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerTop, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="leaf" size={32} color={Colors.primary} />
          <View>
            <Text style={styles.headerTitle}>Recoleccta</Text>
            <Text style={styles.headerSubtitle}>Impacto positivo</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.mainContent}>
            
            {/* Render Tabs only for login/register modes */}
            {(mode === 'login' || mode === 'register') && (
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'login' && styles.tabActive]}
                  onPress={() => setMode('login')}
                >
                  <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                    Iniciar sesión
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === 'register' && styles.tabActive]}
                  onPress={() => setMode('register')}
                >
                  <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                    Registrarse
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Render Login & Registration Forms */}
            {(mode === 'login' || mode === 'register') && (
              <View>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {mode === 'login' ? 'Bienvenido de nuevo' : 'Únete a Recoleccta'}
                  </Text>
                  <Text style={styles.formDescription}>
                    {mode === 'login'
                      ? 'Ingresa tus credenciales para continuar con tu impacto positivo.'
                      : 'Crea una cuenta para empezar a contribuir con el reciclaje.'}
                  </Text>
                </View>

                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>TIPO DE CUENTA</Text>
                    <View style={styles.accountTypeRow}>
                      {ACCOUNT_OPTIONS.map((option) => {
                        const selected = accountType === option.key;
                        return (
                          <TouchableOpacity
                            key={option.key}
                            style={[styles.accountTypeCard, selected && styles.accountTypeCardActive]}
                            onPress={() => setAccountType(option.key)}
                            activeOpacity={0.85}
                          >
                            <MaterialCommunityIcons name={option.icon} size={26} color={selected ? Colors.primary : Colors.onSurfaceVariant} />
                            <Text style={[styles.accountTypeTitle, selected && { color: Colors.primary }]}>{option.title}</Text>
                            <Text style={styles.accountTypeHint}>{option.hint}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {mode === 'register' && accountType === 'business' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>NOMBRE DEL NEGOCIO</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ej. Restaurante El Sabor"
                        placeholderTextColor={Colors.onSurfaceVariant}
                        autoCapitalize="words"
                        value={businessName}
                        onChangeText={setBusinessName}
                        editable={!loading}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>TIPO DE COMERCIO</Text>
                      <View style={styles.chipRow}>
                        {BUSINESS_TYPES.map((type) => {
                          const selected = businessType === type;
                          return (
                            <TouchableOpacity
                              key={type}
                              style={[styles.typeChip, selected && styles.typeChipActive]}
                              onPress={() => setBusinessType(type)}
                              activeOpacity={0.85}
                            >
                              <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>{type}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>TELÉFONO DEL NEGOCIO</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ej. 316 000 0000"
                        placeholderTextColor={Colors.onSurfaceVariant}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                        editable={!loading}
                      />
                    </View>
                  </>
                )}

                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{accountType === 'business' ? 'NOMBRE DE CONTACTO' : 'NOMBRE'}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="¿Cómo te llamas?"
                      placeholderTextColor={Colors.onSurfaceVariant}
                      autoCapitalize="words"
                      value={name}
                      onChangeText={setName}
                      editable={!loading}
                    />
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="nombre@ejemplo.com"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.passwordHeaderRow}>
                    <Text style={styles.inputLabel}>CONTRASEÑA</Text>
                    {mode === 'login' && (
                      <TouchableOpacity activeOpacity={0.7} onPress={() => setMode('recover')}>
                        <Text style={styles.forgotLink}>Olvidé mi contraseña</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                      placeholderTextColor={Colors.onSurfaceVariant}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                      style={styles.eyeButton}
                    >
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={Colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.onPrimary} size="small" />
                  ) : (
                    <View style={styles.submitButtonContent}>
                      <Text style={styles.submitButtonText}>
                        {mode === 'login' ? 'Acceder' : 'Crear cuenta'}
                      </Text>
                      <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.onPrimary} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Render Recovery Request Form */}
            {mode === 'recover' && (
              <View>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Recuperar contraseña</Text>
                  <Text style={styles.formDescription}>
                    Ingresa tu correo electrónico y te enviaremos un código de verificación de 6 caracteres.
                  </Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="nombre@ejemplo.com"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                  />
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleRequestOTP}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.onPrimary} size="small" />
                  ) : (
                    <View style={styles.submitButtonContent}>
                      <Text style={styles.submitButtonText}>Enviar código</Text>
                      <MaterialCommunityIcons email-outline="email-send-outline" size={20} color={Colors.onPrimary} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Back to Login Link */}
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setMode('login')}
                  disabled={loading}
                >
                  <Text style={styles.backLinkLabel}>Volver a iniciar sesión</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Render Reset Password Form */}
            {mode === 'reset' && (
              <View>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Restablecer contraseña</Text>
                  <Text style={styles.formDescription}>
                    Ingresa el código de 6 caracteres que te llegó al correo y tu nueva contraseña.
                  </Text>
                </View>

                {/* Email (Read Only Visual Info) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
                  <TextInput
                    style={[styles.input, { opacity: 0.6 }]}
                    value={email}
                    editable={false}
                  />
                </View>

                {/* OTP Code Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CÓDIGO DE VERIFICACIÓN (OTP)</Text>
                  <TextInput
                    style={[styles.input, { letterSpacing: 4, textAlign: 'center', fontWeight: 'bold' }]}
                    placeholder="ABC123"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    editable={!loading}
                  />
                </View>

                {/* New Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NUEVA CONTRASEÑA</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={Colors.onSurfaceVariant}
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      activeOpacity={0.7}
                      style={styles.eyeButton}
                    >
                      <MaterialCommunityIcons
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={Colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.onPrimary} size="small" />
                  ) : (
                    <View style={styles.submitButtonContent}>
                      <Text style={styles.submitButtonText}>Restablecer contraseña</Text>
                      <MaterialCommunityIcons name="lock-reset" size={20} color={Colors.onPrimary} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Back to Login Link */}
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setMode('login')}
                  disabled={loading}
                >
                  <Text style={styles.backLinkLabel}>Volver a iniciar sesión</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>

          {/* Footer Plants */}
          <View style={styles.footer}>
            <View style={styles.plantsRow}>
              <View style={[styles.plant, { height: 80 }]} />
              <View style={[styles.plant, { height: 128 }]} />
              <View style={[styles.plant, { height: 64 }]} />
              <View style={[styles.plant, { height: 112 }]} />
              <View style={[styles.plant, { height: 56 }]} />
            </View>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>TRABAJANDO POR UN MUNDO MÁS LIMPIO</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  headerTop: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  mainContent: {
    marginTop: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 6,
    marginBottom: 32,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  formHeader: {
    marginBottom: 28,
    gap: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  formDescription: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    fontWeight: '400',
  },
  inputGroup: {
    marginBottom: 20,
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  accountTypeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  accountTypeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  accountTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  accountTypeHint: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  typeChipTextActive: {
    color: Colors.onPrimary,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  input: {
    height: 56,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.onSurface,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}40`,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  forgotLink: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}40`,
    height: 56,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.onSurface,
  },
  eyeButton: {
    paddingRight: 16,
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    height: 64,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onPrimary,
    letterSpacing: 0.5,
  },
  backLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  backLinkLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  plantsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  plant: {
    width: 12,
    backgroundColor: Colors.primaryFixed,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  footerDivider: {
    width: 48,
    height: 2,
    backgroundColor: `${Colors.primary}40`,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
});

