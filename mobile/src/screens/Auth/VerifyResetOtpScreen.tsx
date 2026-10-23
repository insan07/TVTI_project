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
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { RADIUS } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../../components/shared/Toast';
import { authApi } from '../../services/api';

export default function VerifyResetOtpScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const route = useRoute<any>();
  const email = route.params?.email || '';

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

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

  const handleVerifyOtp = async () => {
    setErrorMsg('');
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      const msg = 'Please enter the verification code.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    if (cleanOtp.length !== 6) {
      const msg = 'Please enter a 6-digit code.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyResetOtp(email, cleanOtp);
      showToast(response.data.message || 'OTP verified successfully.', 'success');
      navigation.navigate('ResetPassword', {
        resetToken: response.data.resetToken
      });
    } catch (e: any) {
      const serverMsg = e.response?.data?.message || 'Unable to verify OTP at this time.';
      setErrorMsg(serverMsg);
      showToast(serverMsg, 'error');
      Alert.alert('Verification Failed', serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    try {
      const response = await authApi.resendResetOtp(email);
      showToast(response.data.message || 'Verification code resent.', 'success');
      setCooldown(60);
    } catch (e: any) {
      const serverMsg = e.response?.data?.message || 'Unable to resend OTP at this time.';
      showToast(serverMsg, 'error');
      if (e.response?.data?.cooldownRemaining) {
        setCooldown(e.response.data.cooldownRemaining);
      }
    } finally {
      setIsResending(false);
    }
  };

  const renderOtpCard = () => (
    <View style={[styles.card, isDesktop && styles.desktopCard]}>
      {/* Back to previous screen */}
      <TouchableOpacity
        onPress={() => {
          if (navigation?.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('ForgotPassword');
          }
        }}
        style={styles.backButtonRow}
        activeOpacity={0.7}
      >
        <Icon name="arrow-back" size={18} color="#FF6500" style={{ marginRight: 6 }} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.welcomeTitle}>Verify Code</Text>
      <Text style={styles.welcomeSubtitle}>
        Enter the 6-digit code sent to{'\n'}
        <Text style={{ color: '#FF6500', fontWeight: '600' }}>{email || 'your email'}</Text>
      </Text>

      {/* Error Banner */}
      {errorMsg ? (
        <View style={styles.errorBox}>
          <Icon name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.errorBoxText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* OTP Input */}
      <Text style={styles.inputLabel}>Verification Code</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
        ]}
      >
        <Icon
          name="shield-checkmark-outline"
          size={18}
          color={isFocused ? '#FF6500' : '#8A7D71'}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            { letterSpacing: 4, fontWeight: '700' },
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)
          ]}
          placeholder="123456"
          placeholderTextColor="#6B5E52"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={(text) => {
            setOtp(text);
            if (errorMsg) setErrorMsg('');
          }}
        />
      </View>

      {/* Verify Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleVerifyOtp}
        disabled={isLoading}
        activeOpacity={0.88}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      {/* Resend Section */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={cooldown > 0 || isResending}
          activeOpacity={0.7}
        >
          {isResending ? (
            <ActivityIndicator size="small" color="#FF6500" />
          ) : (
            <Text style={[styles.link, cooldown > 0 && { color: '#8E8276' }]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </Text>
          )}
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

                {/* Floating 3D Artwork */}
                <View style={styles.heroImageWrapper}>
                  <Image
                    source={require('../../../assets/login_hero_clay.jpg')}
                    style={styles.heroImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Right Column: Glassmorphism OTP Card */}
              <View style={styles.desktopRightCol}>
                {renderOtpCard()}
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
                {renderOtpCard()}
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

  /* ---------- Card Component Styles ---------- */
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
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    color: '#A89F93',
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
    marginBottom: 22,
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
    fontSize: 15,
    color: '#FFFFFF',
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
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  resendText: {
    color: '#8E8276',
    fontSize: 13.5,
  },
  link: {
    color: '#FF6500',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
