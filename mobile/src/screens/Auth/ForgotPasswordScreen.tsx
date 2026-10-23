import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { RADIUS } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../../components/shared/Toast';
import { authApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Theme mode: 'light' | 'dark'
  const { mode: themeMode, isDark, toggleTheme } = useTheme();

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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
            -webkit-box-shadow: 0 0 0 1000px rgba(22, 16, 12, 0.70) inset !important;
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

  const handleSendOtp = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      const msg = 'Please enter your email address.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const msg = 'Please enter a valid email address.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.forgotPassword(cleanEmail);
      showToast(response.data.message || 'Verification code sent.', 'success');
      navigation.navigate('VerifyResetOtp', { email: cleanEmail });
    } catch (e: any) {
      const serverMsg = e.response?.data?.message || 'Unable to process your request at this time.';
      setErrorMsg(serverMsg);
      showToast(serverMsg, 'error');
      Alert.alert('Request Failed', serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderForgotCard = () => (
    <View
      style={[
        styles.card,
        isLight ? styles.cardLight : styles.cardDark,
        isDesktop && (isLight ? styles.desktopCardLight : styles.desktopCardDark),
      ]}
    >
      {/* Back to login header action */}
      <TouchableOpacity
        onPress={() => {
          if (navigation?.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Login');
          }
        }}
        style={styles.backButtonRow}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={18} color="#FF6500" style={{ marginRight: 6 }} />
        <Text style={styles.backButtonText}>Back to Sign In</Text>
      </TouchableOpacity>

      <Text style={[styles.welcomeTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
        Forgot Password
      </Text>
      <Text style={[styles.welcomeSubtitle, { color: isLight ? '#64748B' : '#A89F93' }]}>
        Enter the email address associated with your TVTI account to receive a verification code.
      </Text>

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

      {/* Email Input */}
      <Text style={[styles.inputLabel, { color: isLight ? '#1E293B' : '#D4CAC0' }]}>
        Email Address
      </Text>
      <View
        style={[
          styles.inputContainer,
          isLight ? styles.inputContainerLight : styles.inputContainerDark,
          isFocused && (isLight ? styles.inputContainerFocusedLight : styles.inputContainerFocusedDark),
        ]}
      >
        <Icon
          name="mail-outline"
          size={18}
          color={isFocused ? '#FF5E14' : (isLight ? '#94A3B8' : '#8A7D71')}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            { color: isLight ? '#0F172A' : '#FFFFFF' },
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
          ]}
          placeholder="e.g. student@gmail.com"
          placeholderTextColor={isLight ? '#94A3B8' : '#6B5E52'}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={(text) => {
            setEmail(text);
            if (errorMsg) setErrorMsg('');
          }}
        />
      </View>

      {/* Send OTP Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSendOtp}
        disabled={isLoading}
        activeOpacity={0.88}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: isLight ? '#64748B' : '#8E8276' }]}>
          Remember your password?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isLight ? '#F8FAFC' : '#0F0B08' }]} edges={['top', 'bottom']}>
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
              background: isLight
                ? (isDesktop
                  ? 'radial-gradient(ellipse at 50% 45%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.28) 55%, rgba(255, 255, 255, 0.42) 88%), linear-gradient(to right, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.16) 48%, rgba(255, 255, 255, 0.34) 100%)'
                  : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0.16) 45%, rgba(255, 255, 255, 0.40) 100%)')
                : (isDesktop
                  ? 'radial-gradient(circle at 86% 8%, rgba(255, 115, 0, 0.22) 0%, rgba(255, 90, 0, 0.08) 35%, transparent 60%), linear-gradient(to right, rgba(14, 10, 7, 0.92) 0%, rgba(14, 10, 7, 0.64) 46%, rgba(14, 10, 7, 0.82) 100%)'
                  : 'linear-gradient(to bottom, rgba(14, 10, 7, 0.88) 0%, rgba(14, 10, 7, 0.70) 50%, rgba(14, 10, 7, 0.92) 100%)'),
            } as any,
          ]}
        />
      ) : (
        <LinearGradient
          colors={
            isLight
              ? ['rgba(255, 255, 255, 0.36)', 'rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.40)']
              : ['rgba(14, 10, 7, 0.88)', 'rgba(14, 10, 7, 0.65)', 'rgba(14, 10, 7, 0.90)']
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
            /* =================== DESKTOP 2-COLUMN VIEW =================== */
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
                    <Text style={[styles.desktopBrandSub, { color: isLight ? '#475569' : '#A89F93' }]}>
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
                  <Text style={[styles.heroSubDescription, { color: isLight ? '#334155' : '#C5BCB3' }]}>
                    Twintec VTI Learning Management System{'\n'}Your journey towards a brighter future starts here.
                  </Text>
                </View>

                {/* Floating 3D Artwork */}
                <View style={styles.heroImageWrapper}>
                  <Image
                    source={require('../../../assets/login_hero_clay.png')}
                    style={styles.heroImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Right Column: Glassmorphism Forgot Password Card */}
              <View style={styles.desktopRightCol}>
                {renderForgotCard()}
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
                <Text style={[styles.brandSubtitle, { color: isLight ? '#475569' : '#A89F93' }]}>
                  Learning Management System
                </Text>
              </View>

              <View style={styles.mobileCardWrapper}>
                {renderForgotCard()}
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
    backgroundColor: 'rgba(30, 22, 16, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
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

  /* ---------- Card Component Styles ---------- */
  card: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.62)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
    ...(Platform.OS === 'web'
      ? ({
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.10), 0 0 1px 1px rgba(255, 255, 255, 0.9)',
      } as any)
      : {}),
  },
  cardDark: {
    backgroundColor: 'rgba(28, 20, 15, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.80,
    shadowRadius: 24,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' } as any)
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
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FF6500',
    fontSize: 13,
    fontWeight: '600',
  },
  welcomeTitle: {
    fontSize: 25,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 24,
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
    marginBottom: 22,
    paddingHorizontal: 14,
    height: 48,
  },
  inputContainerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
    borderColor: 'rgba(203, 213, 225, 0.72)',
    borderWidth: 1.2,
    ...(Platform.OS === 'web'
      ? ({
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      } as any)
      : {}),
  },
  inputContainerDark: {
    backgroundColor: 'rgba(16, 11, 7, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1.1,
  },
  inputContainerFocusedLight: {
    borderColor: '#FF5E14',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? ({
        boxShadow: '0 0 0 3px rgba(255, 94, 20, 0.14)',
      } as any)
      : {}),
  },
  inputContainerFocusedDark: {
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
    backgroundColor: 'transparent',
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
