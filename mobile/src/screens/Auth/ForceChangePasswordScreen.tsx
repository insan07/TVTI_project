import { KeyboardAvoidingView, KeyboardScrollView as ScrollView } from '../../components/shared/KeyboardForm';
import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Image, useWindowDimensions } from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { RADIUS } from '../../config/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { showToast } from '../../components/shared/Toast';
import { AuthTextInput } from '../../components/shared/AuthForm';

export default function ForceChangePasswordScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const authContext = useContext(AuthContext) as any;
  const user = authContext?.user;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'new' | 'confirm' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const isLight = !isDark;


  const handleSetPassword = async () => {
    setErrorMsg('');

    if (!newPassword.trim() || !confirmPassword.trim()) {
      const msg = 'Please enter and confirm your new password.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    if (newPassword.length < 6) {
      const msg = 'Your new password must be at least 6 characters long.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'New passwords do not match. Please verify your entries.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      setLoading(true);
      await api.put('/users/force-change-password', {
        newPassword: newPassword.trim(),
      });
      showToast('Password updated successfully! Welcome to TVTI.', 'success');
      Alert.alert('Success', 'Password updated successfully! Welcome.');

      // Update AuthContext user state to clear must_change_password
      if (authContext?.setUser) {
        authContext.setUser({
          ...user,
          must_change_password: false,
        });
      } else if (authContext?.fetchMe) {
        authContext.fetchMe();
      }
    } catch (e: any) {
      const serverMsg = e.response?.data?.message || 'Failed to update password. Please try again.';
      setErrorMsg(serverMsg);
      showToast(serverMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderCard = () => (
    <View
      style={[
        styles.card,
        isLight ? styles.cardLight : styles.cardDark,
        isDesktop && (isLight ? styles.desktopCardLight : styles.desktopCardDark),
      ]}
    >
      <Text style={[styles.welcomeTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
        First-Time Password Setup
      </Text>
      <Text style={[styles.welcomeSubtitle, { color: isLight ? '#64748B' : '#A89F93' }]}>
        Create a permanent secure password for your TVTI student account.
      </Text>

      {/* Security Info Banner */}
      <View style={[styles.securityBox, isLight ? styles.securityBoxLight : styles.securityBoxDark]}>
        <Icon name="shield-checkmark" size={20} color="#F59E0B" style={{ marginRight: 10, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.securityBoxTitle, { color: isLight ? '#92400E' : '#FBBF24' }]}>
            First Login Password Setup
          </Text>
          <Text style={[styles.securityBoxSub, { color: isLight ? '#78350F' : '#FDE68A' }]}>
            Welcome, <Text style={{ fontWeight: '700' }}>{user?.name || 'Student'}</Text>! Please set your new private password below.
          </Text>
        </View>
      </View>

      {/* Read-Only Student Profile Details */}
      <View style={[styles.profileSummaryBox, isLight ? styles.profileSummaryBoxLight : styles.profileSummaryBoxDark]}>
        <Text style={[styles.profileSummaryTitle, { color: isLight ? '#475569' : '#CBD5E1' }]}>
          Student Identity Profile
        </Text>

        <View style={styles.readOnlyRow}>
          <Text style={[styles.readOnlyLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Reg No / Index:</Text>
          <Text style={styles.readOnlyValueBold}>{user?.index_number || 'Registered Student'}</Text>
        </View>

        <View style={styles.readOnlyRow}>
          <Text style={[styles.readOnlyLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Full Name:</Text>
          <Text style={[styles.readOnlyValue, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>{user?.name || 'N/A'}</Text>
        </View>

        <View style={styles.readOnlyRow}>
          <Text style={[styles.readOnlyLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Email Address:</Text>
          <Text style={[styles.readOnlyValue, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>{user?.email || 'N/A'}</Text>
        </View>

        <View style={[styles.lockNoticeRow, { borderTopColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)' }]}>
          <Icon name="lock-closed" size={13} color={isLight ? '#64748B' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.lockNoticeText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
            Profile details verified by TVTI Admin and cannot be edited.
          </Text>
        </View>
      </View>

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

      {/* New Permanent Password Input */}
      <Text style={[styles.inputLabel, { color: isLight ? '#1E293B' : '#D4CAC0' }]}>
        New Permanent Password *
      </Text>
      <View
        style={[
          styles.inputContainer,
          isLight ? styles.inputContainerLight : styles.inputContainerDark,
          focusedInput === 'new' && (isLight ? styles.inputContainerFocusedLight : styles.inputContainerFocusedDark),
        ]}
      >
        <Icon
          name="lock-closed-outline"
          size={18}
          color={focusedInput === 'new' ? '#FF5E14' : (isLight ? '#94A3B8' : '#8A7D71')}
          style={styles.inputIcon}
        />
        <AuthTextInput
          style={[
            styles.input,
            { color: isLight ? '#0F172A' : '#FFFFFF' },
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
          ]}
          placeholder="At least 6 characters"
          placeholderTextColor={isLight ? '#94A3B8' : '#6B5E52'}
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onFocus={() => setFocusedInput('new')}
          onBlur={() => setFocusedInput(null)}
          onChangeText={(t) => {
            setNewPassword(t);
            if (errorMsg) setErrorMsg('');
          }}
        />
        <TouchableOpacity
          onPress={() => setShowNewPassword(!showNewPassword)}
          style={styles.eyeIcon}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={showNewPassword ? '#FF5E14' : (isLight ? '#94A3B8' : '#8A7D71')}
          />
        </TouchableOpacity>
      </View>

      {/* Confirm New Password Input */}
      <Text style={[styles.inputLabel, { color: isLight ? '#1E293B' : '#D4CAC0' }]}>
        Confirm New Password *
      </Text>
      <View
        style={[
          styles.inputContainer,
          isLight ? styles.inputContainerLight : styles.inputContainerDark,
          focusedInput === 'confirm' && (isLight ? styles.inputContainerFocusedLight : styles.inputContainerFocusedDark),
        ]}
      >
        <Icon
          name="lock-closed-outline"
          size={18}
          color={focusedInput === 'confirm' ? '#FF5E14' : (isLight ? '#94A3B8' : '#8A7D71')}
          style={styles.inputIcon}
        />
        <AuthTextInput
          style={[
            styles.input,
            { color: isLight ? '#0F172A' : '#FFFFFF' },
            Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
          ]}
          placeholder="Re-enter new password"
          placeholderTextColor={isLight ? '#94A3B8' : '#6B5E52'}
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onFocus={() => setFocusedInput('confirm')}
          onBlur={() => setFocusedInput(null)}
          onChangeText={(t) => {
            setConfirmPassword(t);
            if (errorMsg) setErrorMsg('');
          }}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={showConfirmPassword ? '#FF5E14' : (isLight ? '#94A3B8' : '#8A7D71')}
          />
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSetPassword}
        disabled={loading}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.buttonContent}>
            <Icon name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Set Password & Enter Portal</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isLight ? '#F8FAFC' : '#0B0F19' }]} edges={['top', 'bottom']}>
      {/* Background Image */}
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
            filter: isLight ? 'blur(3px)' : 'none',
            transform: isLight ? 'scale(1.03)' : 'none',
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
                  ? 'radial-gradient(ellipse at 50% 45%, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.58) 55%, rgba(255, 255, 255, 0.76) 88%), linear-gradient(to right, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.42) 48%, rgba(255, 255, 255, 0.60) 100%)'
                  : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.60) 0%, rgba(255, 255, 255, 0.42) 45%, rgba(255, 255, 255, 0.72) 100%)')
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
              ? ['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.75)']
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
            /* =================== DESKTOP 2-COLUMN VIEW =================== */
            <View style={styles.desktopContainer}>
              {/* Left Column: TVTI Branding, Hero Typography & 3D Illustration */}
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
                    Welcome to Twintec VTI LMS.{'\n'}Please secure your account with a permanent password to access course modules.
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

              {/* Right Column: Glassmorphism Setup Card */}
              <View style={styles.desktopRightCol}>
                {renderCard()}
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
                {renderCard()}
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

  /* ---------- Mobile Layout Styles ---------- */
  mobileScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  mobileContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  mobileHeader: {
    alignItems: 'center',
    marginBottom: 24,
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
    maxWidth: 490,
    width: '100%',
  },

  /* ---------- Card Component Styles ---------- */
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
    paddingVertical: 36,
    paddingHorizontal: 34,
  },
  desktopCardDark: {
    paddingVertical: 34,
    paddingHorizontal: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
    textAlign: 'center',
    alignSelf: 'center',
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    marginBottom: 20,
    textAlign: 'center',
    alignSelf: 'center',
    lineHeight: 19,
  },

  /* Security Box */
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  securityBoxLight: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  securityBoxDark: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  securityBoxTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  securityBoxSub: {
    fontSize: 12.5,
    lineHeight: 18,
  },

  /* Profile Summary Box */
  profileSummaryBox: {
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 18,
  },
  profileSummaryBoxLight: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileSummaryBoxDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileSummaryTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  readOnlyLabel: {
    fontSize: 12.5,
  },
  readOnlyValue: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  readOnlyValueBold: {
    fontSize: 13,
    color: '#FF6500',
    fontWeight: '700',
  },
  lockNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  lockNoticeText: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  /* Error Box */
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

  /* Form Inputs */
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
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
    padding: 6,
  },

  /* Action Button */
  button: {
    backgroundColor: '#FF5E14',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
});
