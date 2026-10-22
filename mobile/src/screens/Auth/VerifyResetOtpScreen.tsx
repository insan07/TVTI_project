import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../../components/shared/Toast';
import { authApi } from '../../services/api';

export default function VerifyResetOtpScreen() {
  const route = useRoute<any>();
  const email = route.params?.email || '';
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const navigation = useNavigation<any>();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      showToast('Please enter the verification code.', 'error');
      return;
    }
    
    if (cleanOtp.length !== 6) {
      showToast('Please enter a 6-digit code.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyResetOtp(email, cleanOtp);
      showToast(response.data.message || 'OTP verified successfully.', 'success');
      
      // Navigate to Reset Password
      navigation.navigate('ResetPassword', { 
        resetToken: response.data.resetToken 
      });
    } catch (e: any) {
      const serverMsg = e.response?.data?.message || 'Unable to verify OTP at this time.';
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
      setCooldown(60); // 60 seconds cooldown
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('ForgotPassword');
              }
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Icon name="key-outline" size={64} color={COLORS.primary} style={styles.icon} />
          
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit verification code sent to your email.
          </Text>

          <Text style={styles.inputLabel}>Verification Code</Text>
          <View style={styles.inputContainer}>
            <Icon name="shield-checkmark-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)
              ]}
              placeholder="123456"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerifyOtp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity 
              onPress={handleResendOtp} 
              disabled={isResending || cooldown > 0}
            >
              <Text style={[styles.resendLink, (isResending || cooldown > 0) && styles.resendLinkDisabled]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
    marginLeft: -SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 26,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    ...FONTS.regular,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
    lineHeight: 22,
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
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 4,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOW.md,
  },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    ...FONTS.bold,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  resendText: {
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  resendLink: {
    color: COLORS.secondary,
    ...FONTS.semiBold,
  },
  resendLinkDisabled: {
    color: COLORS.textMuted,
  },
});
