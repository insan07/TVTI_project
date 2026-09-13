import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Alert
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../../components/shared/Toast';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const route = useRoute<any>();
  const initialEmail = route.params?.registeredEmail || '';
  const initialMsg = route.params?.infoMessage || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState(initialMsg);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  const authContext = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail && !cleanPassword) {
      const msg = 'Please enter your Registration Number or Email address and Password to log in.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      Alert.alert('Login Required', msg);
      return;
    }
    if (!cleanEmail) {
      const msg = 'Please enter your Registration Number or Email address.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      Alert.alert('Email / Reg No Required', msg);
      return;
    }
    if (!cleanPassword) {
      const msg = 'Please enter your Password.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      Alert.alert('Password Required', msg);
      return;
    }

    try {
      await authContext?.login(cleanEmail, cleanPassword);
      showToast('Logged in successfully', 'success');
    } catch (e: any) {
      const serverMsg = e.response?.data?.message || e.message;
      const status = e.response?.status;

      let alertTitle = 'Login Failed';
      let fullMessage = 'Invalid Registration Number/Email or Password. Please verify your details and try again.';
      let isPending = false;

      if (serverMsg) {
        const msgLower = String(serverMsg).toLowerCase();
        if (msgLower.includes('pending') || msgLower.includes('inactive')) {
          alertTitle = 'Account Pending Approval';
          fullMessage = 'Your student registration has been received and is currently awaiting Admin approval. You will receive an email with your credentials once approved.';
          isPending = true;
        } else if (msgLower.includes('expired')) {
          alertTitle = 'Temporary Password Expired';
          fullMessage = 'Your 7-day temporary password has expired. Please contact TVTI Administration to request a password reset.';
        } else if (msgLower.includes('invalid') || msgLower.includes('credentials') || status === 401) {
          alertTitle = 'Invalid Credentials';
          fullMessage = 'The Registration Number/Email or Password you entered is incorrect. Please verify your details and try again.';
        } else {
          alertTitle = 'Login Failed';
          fullMessage = serverMsg;
        }
      } else {
        alertTitle = 'Connection Error';
        fullMessage = 'Unable to connect to the TVTI LMS server. Please check your internet connection and try again.';
      }

      if (isPending) {
        setInfoMsg(fullMessage);
        showToast('Account Pending Admin Approval', 'error');
      } else {
        setErrorMsg(fullMessage);
        showToast(alertTitle, 'error');
      }

      // Pop up official Alert modal acknowledgment
      Alert.alert(alertTitle, fullMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>Twintec VTI</Text>
        <Text style={styles.brandSubtitle}>Learning Management System</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.cardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.card}
          contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>Sign in to access your portal</Text>

          {/* Info Banner (e.g. Registered awaiting approval) */}
          {infoMsg ? (
            <View style={styles.infoBox}>
              <Icon name="information-circle-outline" size={20} color="#0D9488" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.infoBoxText}>{infoMsg}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email / Registration No Input */}
          <Text style={styles.inputLabel}>Registration No or Email Address</Text>
          <View
            style={[
              styles.inputContainer,
              focusedInput === 'email' && styles.inputContainerFocused,
            ]}
          >
            <Icon
              name="person-outline"
              size={20}
              color={focusedInput === 'email' ? COLORS.primary : COLORS.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)
              ]}
              placeholder="e.g. 26T0001 or student@gmail.com"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              value={email}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMsg) setErrorMsg('');
              }}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View
            style={[
              styles.inputContainer,
              focusedInput === 'password' && styles.inputContainerFocused,
            ]}
          >
            <Icon
              name="lock-closed-outline"
              size={20}
              color={focusedInput === 'password' ? COLORS.primary : COLORS.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)
              ]}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMsg) setErrorMsg('');
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={showPassword ? COLORS.primary : COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={authContext?.isLoading}
            activeOpacity={0.8}
          >
            {authContext?.isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Register Here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerGradient: {
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: SPACING.xs,
  },
  brandTitle: {
    fontSize: 26,
    color: '#FFFFFF',
    ...FONTS.bold,
  },
  brandSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    ...FONTS.regular,
    marginTop: 2,
  },
  cardContainer: {
    flex: 1,
    marginTop: -28,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.xl,
    ...SHADOW.md,
  },
  welcomeTitle: {
    fontSize: 22,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    ...FONTS.regular,
    marginBottom: SPACING.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoBoxText: {
    flex: 1,
    color: '#0F766E',
    fontSize: 13,
    lineHeight: 19,
    ...FONTS.medium,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorBoxText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 19,
    ...FONTS.medium,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    ...FONTS.regular,
  },
  eyeIcon: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOW.md,
  },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    ...FONTS.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  link: {
    color: COLORS.secondary,
    ...FONTS.semiBold,
  },
});
