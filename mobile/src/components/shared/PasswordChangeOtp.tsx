import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardTextInput as TextInput } from './KeyboardForm';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';

export default function PasswordChangeOtp({ otp, onChange, currentPassword, disabled }: { otp: string; onChange: (value: string) => void; currentPassword?: string; disabled?: boolean }) {
  const { isDark } = useTheme(), theme = usersSectionTheme(isDark);
  const [sending, setSending] = useState(false), [remaining, setRemaining] = useState(0), [message, setMessage] = useState(''), [error, setError] = useState('');
  const busy = useRef(false);
  useEffect(() => { if (!remaining) return; const timer = setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [remaining]);
  const send = async () => {
    if (busy.current || remaining) return;
    busy.current = true; setSending(true); setError('');
    try {
      const result = await api.post('/users/password-change-otp', { currentPassword });
      onChange(''); setRemaining(result.data.resend_after || 60); setMessage(result.data.message);
    } catch (failure: any) { setError(failure.response?.data?.message || 'Verification email could not be sent.'); if (failure.response?.status === 429) setRemaining(60); }
    finally { busy.current = false; setSending(false); }
  };
  return <View style={styles.section}>
    <Text style={[styles.label, { color: theme.text }]}>Email verification code *</Text>
    <Text style={[styles.copy, { color: theme.muted }]}>Verify the six-digit code sent to your registered email before changing your password.</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send password change code" disabled={disabled || sending || remaining > 0} onPress={() => { void send(); }} style={[styles.button, { backgroundColor: theme.field, borderColor: theme.line }]}>
      {sending ? <ActivityIndicator color={theme.accent} /> : <Text style={[styles.label, { color: theme.accent }]}>{remaining ? `Resend in ${remaining}s` : 'Send verification code'}</Text>}
    </TouchableOpacity>
    {!!message && <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: theme.muted }]}>{message}</Text>}
    {!!error && <Text accessibilityRole="alert" style={[styles.copy, { color: '#DC2626' }]}>{error}</Text>}
    <TextInput accessibilityLabel="Password change verification code" editable={!disabled} value={otp} onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.line }]} />
  </View>;
}
const styles = StyleSheet.create({ section: { gap: 10, marginVertical: 14 }, label: { fontSize: 13, fontWeight: '600' }, copy: { fontSize: 12, lineHeight: 18 }, button: { padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' }, input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 18, letterSpacing: 4 } });
