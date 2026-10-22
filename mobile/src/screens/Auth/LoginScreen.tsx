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

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'lms-autofill-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px rgba(22, 16, 12, 0.70) inset !important;
            -webkit-text-fill-color: #FFFFFF !important;
            caret-color: #FFFFFF !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          input {
            background-color: transparent !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

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
    <View style={[styles.card, isDesktop && styles.desktopCard]}>
      <Text style={styles.welcomeTitle}>Welcome Back</Text>
      <Text style={styles.welcomeSubtitle}>Sign in to access your portal!</Text>

      {/* Info Banner */}
      {infoMsg ? (
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={18} color="#0D9488" style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.infoBoxText}>{infoMsg}</Text>
        </View>
      ) : null}

      {/* Error Banner */}
      {errorMsg ? (
        <View style={styles.errorBox}>
          <Icon name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
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
          size={18}
          color={focusedInput === 'email' ? '#FF6500' : '#8A7D71'}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)
          ]}
          placeholder="admin@tvti.edu.lk"
          placeholderTextColor="#6B5E52"
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
          size={18}
          color={focusedInput === 'password' ? '#FF6500' : '#8A7D71'}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)
          ]}
          placeholder="••••••••"
          placeholderTextColor="#6B5E52"
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
            color={showPassword ? '#FF6500' : '#8A7D71'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.forgotPasswordContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Register Here</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* TVTI Campus Building Background Image */}
      <Image
        source={require('../../../assets/background.jpeg')}
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

      {/* Atmospheric Overlays */}
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
              background: isDesktop
                ? 'radial-gradient(circle at 86% 8%, rgba(255, 115, 0, 0.22) 0%, rgba(255, 90, 0, 0.08) 35%, transparent 60%), linear-gradient(to right, rgba(14, 10, 7, 0.92) 0%, rgba(14, 10, 7, 0.64) 46%, rgba(14, 10, 7, 0.82) 100%)'
                : 'linear-gradient(to bottom, rgba(14, 10, 7, 0.88) 0%, rgba(14, 10, 7, 0.70) 50%, rgba(14, 10, 7, 0.92) 100%)',
            } as any,
          ]}
        />
      ) : (
        <LinearGradient
          colors={[
            'rgba(14, 10, 7, 0.88)',
            'rgba(14, 10, 7, 0.65)',
            'rgba(14, 10, 7, 0.90)',
          ]}
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
                    <Text style={styles.desktopBrandTitle}>Twintec VTI</Text>
                    <Text style={styles.desktopBrandSub}>Learning Management System</Text>
                  </View>
                </View>

                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroLearnText}>Learn</Text>
                  <Text style={styles.heroHighlightText}>Build Your Skills</Text>
                  <Text style={styles.heroHighlightText}>Shape Your Future</Text>
                  <Text style={styles.heroSubDescription}>
                    Twintec VTI Learning Management System{'\n'}Your journey towards a brighter future starts here.
                  </Text>
                </View>

                {/* Floating 3D Artwork (Seamless radial fade into the dark background) */}
                <View style={styles.heroImageWrapper}>
                  <Image
                    source={require('../../../assets/login_hero_clay.jpg')}
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
                <Text style={styles.brandTitle}>Twintec VTI</Text>
                <Text style={styles.brandSubtitle}>Learning Management System</Text>
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
    backgroundColor: '#0F0B08',
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
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#A89F93',
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
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  desktopBrandSub: {
    fontSize: 13,
    color: '#A89F93',
    fontWeight: '400',
    marginTop: 2,
  },
  heroTextContainer: {
    marginBottom: 20,
  },
  heroLearnText: {
    fontSize: 38,
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.3,
  },
  heroHighlightText: {
    fontSize: 38,
    color: '#FF6500',
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.3,
  },
  heroSubDescription: {
    fontSize: 14,
    color: '#C5BCB3',
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
  desktopCard: {
    paddingVertical: 36,
    paddingHorizontal: 34,
    borderRadius: 22,
    backgroundColor: 'rgba(28, 20, 15, 0.42)',
    borderColor: 'rgba(255, 255, 255, 0.13)',
  },

  /* ---------- Login Card Component Styles ---------- */
  card: {
    backgroundColor: 'rgba(28, 20, 15, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' } as any)
      : {}),
  },
  welcomeTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    color: '#A89F93',
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
  infoBoxText: {
    flex: 1,
    color: '#2DD4BF',
    fontSize: 13,
    lineHeight: 19,
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
  errorBoxText: {
    flex: 1,
    color: '#F87171',
    fontSize: 13,
    lineHeight: 19,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D4CAC0',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderWidth: 1.1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 12,
    marginBottom: 18,
    paddingHorizontal: 14,
    height: 48,
  },
  inputContainerFocused: {
    borderColor: '#FF6500',
    backgroundColor: 'rgba(24, 16, 10, 0.65)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    color: '#FFFFFF',
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
    color: '#FF6500',
    fontSize: 12.5,
    fontWeight: '500',
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
    color: '#8E8276',
    fontSize: 13.5,
  },
  link: {
    color: '#FF6500',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

