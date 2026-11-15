import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { KeyboardAvoidingView, KeyboardScrollView, KeyboardTextInput } from './KeyboardForm';
import PasswordChangeOtp from './PasswordChangeOtp';
import { usersSectionTheme } from './usersSectionTheme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

type Props = { onClose: () => void; onSuccess: () => void; email: string };

export default function ProfilePasswordChange({ onClose, onSuccess, email }: Props) {
  const { isDark } = useTheme();
  const theme = usersSectionTheme(isDark);
  const [step, setStep] = useState<'password' | 'otp' | 'new-password'>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const resetVerification = () => {
    setStep('password'); setCurrentPassword(''); setOtp(''); setVerificationToken('');
    setNewPassword(''); setConfirmPassword(''); setVisibleFields({}); setError('');
  };
  const close = () => { if (!busy.current) onClose(); };
  const submit = async () => {
    if (busy.current) return;
    setError('');
    if (step === 'password' && !currentPassword) return setError('Enter your current password or choose email verification.');
    if (step === 'otp' && !/^\d{6}$/.test(otp)) return setError('Send and enter the six-digit code from your registered email.');
    if (step === 'new-password') {
      if (newPassword.length < 6 || newPassword.length > 72) return setError('Use a password between 6 and 72 characters.');
      if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    }
    busy.current = true; setSaving(true);
    try {
      if (step === 'new-password') {
        await api.put('/users/change-password', { verificationToken, newPassword, confirmPassword });
        onSuccess();
      } else {
        const result = await api.post('/users/verify-password-change', step === 'password'
          ? { method: 'password', currentPassword } : { method: 'otp', otp });
        setVerificationToken(result.data.verificationToken);
        setCurrentPassword(''); setOtp(''); setVisibleFields({}); setStep('new-password');
      }
    } catch (failure: any) {
      if (failure.response?.status === 410) resetVerification();
      setError(failure.response?.data?.message || 'Could not complete the password change. Please try again.');
    } finally {
      busy.current = false; setSaving(false);
    }
  };

  const passwordField = (label: string, value: string, onChangeText: (value: string) => void, placeholder: string) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label} *</Text>
      <View style={[styles.passwordRow, { backgroundColor: theme.field, borderColor: theme.line }]}>
        <KeyboardTextInput accessibilityLabel={label} style={[styles.input, { color: theme.text }]}
          value={value} onChangeText={onChangeText} secureTextEntry={!visibleFields[label]}
          editable={!saving} autoCapitalize="none" autoCorrect={false}
          autoComplete={label === 'Current Password' ? 'current-password' : 'new-password'}
          placeholder={placeholder} placeholderTextColor={theme.muted} onSubmitEditing={() => { void submit(); }} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${visibleFields[label] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          onPress={() => setVisibleFields(fields => ({ ...fields, [label]: !fields[label] }))} style={styles.eye}>
          <Icon name={visibleFields[label] ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return <Modal visible animationType="slide" transparent onRequestClose={close}>
    <KeyboardAvoidingView style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <KeyboardScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Change Password</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close password change" disabled={saving} onPress={close} style={styles.eye}>
              <Icon name="close" size={22} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.copy, { color: theme.muted }]}>
            {step === 'password' ? 'First, verify your current password.'
              : step === 'otp' ? `Forgot your current password? Verify with a code sent to your registered email${email ? ` (${email})` : ''}.`
              : 'Identity verified. Enter and confirm your new password.'}
          </Text>

          {step === 'password' && <>
            {passwordField('Current Password', currentPassword, setCurrentPassword, 'Enter current password')}
            <TouchableOpacity accessibilityRole="button" disabled={saving} style={styles.link}
              onPress={() => { setCurrentPassword(''); setVisibleFields({}); setError(''); setStep('otp'); }}>
              <Text style={[styles.label, { color: theme.accent }]}>Forgot current password? Verify with OTP</Text>
            </TouchableOpacity>
          </>}
          {step === 'otp' && <PasswordChangeOtp otp={otp} onChange={setOtp} disabled={saving} />}
          {step === 'new-password' && <>
            {passwordField('New Password', newPassword, setNewPassword, '6 to 72 characters')}
            {passwordField('Confirm New Password', confirmPassword, setConfirmPassword, 'Re-enter new password')}
          </>}
          {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" disabled={saving} style={[styles.secondary, { backgroundColor: theme.field }]}
              onPress={step === 'password' ? close : resetVerification}>
              <Text style={[styles.label, { color: theme.muted }]}>{step === 'password' ? 'Cancel' : 'Back'}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => { void submit(); }}
              style={[styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>
                {step === 'new-password' ? 'Update Password' : step === 'otp' ? 'Verify OTP' : 'Verify Password'}
              </Text>}
            </TouchableOpacity>
          </View>
        </KeyboardScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  card: { width: '88%', maxWidth: 420, maxHeight: '100%', flexShrink: 1, borderRadius: 20, borderWidth: 1 },
  content: { padding: 20 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold' }, copy: { fontSize: 13, lineHeight: 20 },
  field: { gap: 6, marginTop: 16 }, label: { fontSize: 13, fontWeight: '600' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10 },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 }, eye: { padding: 10 },
  link: { paddingVertical: 16 }, error: { color: '#DC2626', fontSize: 13, lineHeight: 20, marginTop: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  secondary: { borderRadius: 10, paddingHorizontal: 16, minHeight: 48, justifyContent: 'center' },
  primary: { borderRadius: 10, paddingHorizontal: 16, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
