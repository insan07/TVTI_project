import React, { useState, useContext, useEffect } from 'react';
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
  useWindowDimensions,
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
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

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
  const { mode: themeMode, isDark, toggleTheme } = useTheme();
  const isLight = !isDark;

  // Web autofill styles for chrome/safari input boxes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'lms-autofill-styles';
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      if (themeMode === 'light') {
        style.innerHTML = `
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
            -webkit-text-fill-color: #0F172A !important;
            caret-color: #0F172A !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          input {
            background-color: transparent !important;
          }
        `;
      } else {
        style.innerHTML = `
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px rgba(15, 23, 42, 0.85) inset !important;
            -webkit-text-fill-color: #FFFFFF !important;
            caret-color: #FFFFFF !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          input {
            background-color: transparent !important;
          }
        `;
      }
    }
  }, [themeMode]);

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

      Alert.alert(alertTitle, fullMessage);
    }
  };

  // Shared Form Card Component
  const renderLoginFormCard = () => (
    <View
      style={[
        styles.card,
        isLight ? styles.cardLight : styles.cardDark,
        isDesktop && (isLight ? styles.desktopCardLight : styles.desktopCardDark),
      ]}
    >
      <Text style={[styles.welcomeTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
        Welcome Back
      </Text>
      <Text style={[styles.welcomeSubtitle, { color: isLight ? '#64748B' : '#A89F93' }]}>
        Sign in to access your portal!
      </Text>

      {/* Info Banner */}
      {infoMsg ? (
        <View style={[styles.infoBox, isLight && styles.infoBoxLight]}>
          <Icon
            name="information-circle-outline"
            size={18}
            color={isLight ? '#0D9488' : '#2DD4BF'}
            style={{ marginRight: 8, marginTop: 2 }}
          />
          <Text style={[styles.infoBoxText, isLight && styles.infoBoxTextLight]}>{infoMsg}</Text>
        </View>
      ) : null}

      {/* Error Banner */}
      {errorMsg ? (
        <View style={[styles.errorBox, isLight && styles.errorBoxLight]}>
          <Icon
            name="alert-circle-outline"
            size={18}
            color={isLight ? '#DC2626' : '#F87171'}
            style={{ marginRight: 8, marginTop: 2 }}
          />
          <Text style={[styles.errorBoxText, isLight && styles.errorBoxTextLight]}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Email / Registration No Input */}
      <Text style={[styles.inputLabel, { color: isLight ? '#1E293B' : '#94A3B8' }]}>
        Registration No or Email Address
      </Text>
      <View
        style={[
          styles.inputContainer,
          isLight ? styles.inputContainerLight : styles.inputContainerDark,
          focusedInput === 'email' && (isLight ? styles.inputContainerFocusedLight : styles.inputContainerFocusedDark),
        ]}
      >
        <Icon
          name="person-outline"
          size={18}
          color={focusedInput === 'email' ? '#FF5E14' : (isLight ? '#94A3B8' : '#64748B')}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            { color: isLight ? '#0F172A' : '#FFFFFF' },
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
          ]}
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
      <Text style={[styles.inputLabel, { color: isLight ? '#1E293B' : '#94A3B8' }]}>
        Password
      </Text>
      <View
        style={[
          styles.inputContainer,
          isLight ? styles.inputContainerLight : styles.inputContainerDark,
          focusedInput === 'password' && (isLight ? styles.inputContainerFocusedLight : styles.inputContainerFocusedDark),
        ]}
      >
        <Icon
          name="lock-closed-outline"
          size={18}
          color={focusedInput === 'password' ? '#FF5E14' : (isLight ? '#94A3B8' : '#64748B')}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            { color: isLight ? '#0F172A' : '#FFFFFF' },
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
          ]}
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
            size={18}
            color={showPassword ? '#FF5E14' : (isLight ? '#94A3B8' : '#8A7D71')}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.forgotPasswordContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={[styles.forgotPasswordText, { color: isLight ? '#B45309' : '#FF6500' }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={authContext?.isLoading}
        activeOpacity={0.88}
      >
        {authContext?.isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
          Don't have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Register Here</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isLight ? '#F8FAFC' : '#0B0F19' }]} edges={['top', 'bottom']}>
      {/* Floating Dark / Light Theme Toggle Button */}
      <View style={[styles.topBarContainer, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          style={[
            styles.themeToggleBtn,
            isLight ? styles.themeToggleBtnLight : styles.themeToggleBtnDark,
          ]}
          onPress={toggleTheme}
          activeOpacity={0.82}
          accessibilityLabel={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
        >
          <Icon
            name={isLight ? 'moon-outline' : 'sunny-outline'}
            size={17}
            color={isLight ? '#334155' : '#F59E0B'}
          />
          <Text style={[styles.themeToggleText, { color: isLight ? '#1E293B' : '#F1F5F9' }]}>
            {isLight ? 'Dark Mode' : 'Light Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* TVTI Campus Building Background Image */}
      <Image
        source={
          isLight
            ? require('../../../assets/backgroundlight.jpeg')
            : require('../../../assets/background.jpeg')
        }
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web' && ({
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            zIndex: -2,
            objectFit: 'cover',
            objectPosition: 'center',
          } as any),
        ]}
        resizeMode="cover"
      />

      {/* Atmospheric Overlays - TVTI Midnight Blue */}
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              position: 'fixed',
              width: '100vw',
              height: '100vh',
              zIndex: -1,
              pointerEvents: 'none',
              background: isLight
                ? (isDesktop
                  ? 'radial-gradient(ellipse at 50% 45%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.28) 55%, rgba(255, 255, 255, 0.42) 88%), linear-gradient(to right, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.16) 48%, rgba(255, 255, 255, 0.34) 100%)'
                  : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0.16) 45%, rgba(255, 255, 255, 0.40) 100%)')
                : (isDesktop
                  ? 'radial-gradient(circle at 86% 8%, rgba(255, 125, 0, 0.28) 0%, rgba(255, 95, 0, 0.12) 30%, transparent 60%), radial-gradient(circle at 82% 94%, rgba(255, 115, 0, 0.10) 0%, transparent 40%), linear-gradient(to right, rgba(15, 23, 42, 0.95) 0%, rgba(18, 26, 42, 0.86) 44%, rgba(15, 22, 36, 0.78) 74%, rgba(12, 17, 28, 0.90) 100%)'
                  : 'radial-gradient(circle at 85% 6%, rgba(255, 120, 0, 0.22) 0%, rgba(255, 90, 0, 0.08) 30%, transparent 55%), linear-gradient(to bottom, rgba(15, 23, 42, 0.94) 0%, rgba(20, 28, 44, 0.90) 50%, rgba(10, 15, 26, 0.98) 100%)'),
            } as any,
          ]}
        />
      ) : (
        <LinearGradient
          colors={
            isLight
              ? ['rgba(255, 255, 255, 0.36)', 'rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.40)']
              : ['rgba(15, 23, 42, 0.95)', 'rgba(20, 28, 44, 0.90)', 'rgba(10, 15, 26, 0.98)']
          }
          style={StyleSheet.absoluteFill}
        />
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={isDesktop ? styles.desktopScrollContent : styles.mobileScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isDesktop ? (
            /* =================== DESKTOP 2-COLUMN VIEW (SWAPPED SIDES) =================== */
            <View style={styles.desktopContainer}>
              {/* Left Column: TVTI Branding, Hero Typography & 3D Clay Illustration */}
              <View style={styles.desktopLeftCol}>
                <View style={styles.desktopBrandRow}>
                  <Image
                    source={require('../../../assets/logo.png')}
                    style={styles.desktopLogo}
                    resizeMode="contain"
                  />
                  <View style={{ marginLeft: 14 }}>
                    <Text style={[styles.desktopBrandTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                      Twintec VTI
                    </Text>
                    <Text style={[styles.desktopBrandSub, { color: isLight ? '#475569' : '#94A3B8' }]}>
                      Learning Management System
                    </Text>
                  </View>
                </View>

                <View style={styles.heroTextContainer}>
                  <Text style={[styles.heroLearnText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                    Learn
                  </Text>
                  <Text style={styles.heroHighlightText}>
                    Build Your Skills
                  </Text>
                  <Text style={[styles.heroLearnText, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                    Shape Your Future
                  </Text>
                  <Text style={[styles.heroSubDescription, { color: isLight ? '#334155' : '#94A3B8' }]}>
                    Twintec VTI Learning Management System{'\n'}Your journey towards a brighter future starts here.
                  </Text>
                </View>

                {/* Floating 3D Artwork (Seamless radial fade into the background) */}
                <View style={styles.heroImageWrapper}>
                  <Image
                    source={require('../../../assets/login_hero_clay.png')}
                    style={styles.heroImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Right Column: Glassmorphism Login Card */}
              <View style={styles.desktopRightCol}>
                {renderLoginFormCard()}
              </View>
            </View>
          ) : (
            /* =================== MOBILE 1-COLUMN VIEW =================== */
            <View style={styles.mobileContainer}>
              <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, 24) }]}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={styles.mobileLogo}
                  resizeMode="contain"
                />
                <Text style={[styles.brandTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Twintec VTI
                </Text>
                <Text style={[styles.brandSubtitle, { color: isLight ? '#475569' : '#94A3B8' }]}>
                  Learning Management System
                </Text>
              </View>

              <View style={styles.mobileCardWrapper}>
                {renderLoginFormCard()}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ---------- Top Bar / Floating Theme Toggle ---------- */
  topBarContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? ({
        cursor: 'pointer',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        userSelect: 'none',
        transition: 'all 0.25s ease',
      } as any)
      : {}),
  },
  themeToggleBtnLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
    borderColor: 'rgba(226, 232, 240, 0.95)',
  },
  themeToggleBtnDark: {
    backgroundColor: 'rgba(20, 27, 38, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  themeToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  /* ---------- Mobile Layout Styles ---------- */
  mobileScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  mobileContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  mobileHeader: {
    alignItems: 'center',
    marginBottom: 26,
  },
  mobileLogo: {
    width: 76,
    height: 76,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
  },
  mobileCardWrapper: {
    width: '100%',
  },

  /* ---------- Desktop Layout Styles ---------- */
  desktopScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 36,
  },
  desktopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1140,
    gap: 60,
  },
  desktopLeftCol: {
    flex: 1.15,
    maxWidth: 540,
  },
  desktopBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  desktopLogo: {
    width: 62,
    height: 62,
  },
  desktopBrandTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  desktopBrandSub: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  heroTextContainer: {
    marginBottom: 20,
  },
  heroLearnText: {
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.3,
  },
  heroHighlightText: {
    fontSize: 38,
    color: '#FF5E14',
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.3,
  },
  heroSubDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  heroImageWrapper: {
    width: '100%',
    maxWidth: 440,
    height: 270,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 8,
    ...(Platform.OS === 'web'
      ? ({
        WebkitMaskImage: 'radial-gradient(ellipse 75% 72% at 50% 50%, black 50%, transparent 88%)',
        maskImage: 'radial-gradient(ellipse 75% 72% at 50% 50%, black 50%, transparent 88%)',
      } as any)
      : {}),
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  desktopRightCol: {
    flex: 1,
    maxWidth: 470,
    width: '100%',
  },

  /* ---------- Login Card Component Styles ---------- */
  card: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.80,
    shadowRadius: 30,
    elevation: 6,
    ...(Platform.OS === 'web'
      ? ({
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.10), 0 0 1px 1px rgba(255, 255, 255, 0.9)',
      } as any)
      : {}),
  },
  cardDark: {
    backgroundColor: 'rgba(20, 27, 38, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.50,
    shadowRadius: 28,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({
        backdropFilter: 'blur(26px)',
        WebkitBackdropFilter: 'blur(26px)',
        boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
      } as any)
      : {}),
  },
  desktopCardLight: {
    paddingVertical: 38,
    paddingHorizontal: 36,
  },
  desktopCardDark: {
    paddingVertical: 36,
    paddingHorizontal: 34,
  },
  welcomeTitle: {
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  infoBoxLight: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  infoBoxText: {
    flex: 1,
    color: '#2DD4BF',
    fontSize: 13,
    lineHeight: 19,
  },
  infoBoxTextLight: {
    color: '#0F766E',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxLight: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  errorBoxText: {
    flex: 1,
    color: '#F87171',
    fontSize: 13,
    lineHeight: 19,
  },
  errorBoxTextLight: {
    color: '#B91C1C',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 18,
    paddingHorizontal: 14,
    height: 48,
  },
  inputContainerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    borderColor: 'rgba(203, 213, 225, 0.72)',
    borderWidth: 1.2,
    ...(Platform.OS === 'web'
      ? ({
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      } as any)
      : {}),
  },
  inputContainerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1.1,
  },
  inputContainerFocusedLight: {
    borderColor: '#FF5E14',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    ...(Platform.OS === 'web'
      ? ({
        boxShadow: '0 0 0 3px rgba(255, 94, 20, 0.14)',
      } as any)
      : {}),
  },
  inputContainerFocusedDark: {
    borderColor: '#FF5E14',
    backgroundColor: 'rgba(20, 27, 38, 0.90)',
    ...(Platform.OS === 'web'
      ? ({
        boxShadow: '0 0 0 3px rgba(249, 115, 22, 0.20)',
      } as any)
      : {}),
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 22,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#FF5E14',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5E14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? ({
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(255, 94, 20, 0.32)',
      } as any)
      : {}),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 13.5,
  },
  link: {
    color: '#FF5E14',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
