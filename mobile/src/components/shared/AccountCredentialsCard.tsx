import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { registrationNumberOf } from '../../utils/registrationIdentity';
import { usersSectionTheme } from './usersSectionTheme';

export default function AccountCredentialsCard({ credentials, emailSent }: { credentials: any; emailSent: boolean }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  const expiry = credentials.expires_at ? new Date(credentials.expires_at) : null;
  const fields = [['Registration number', registrationNumberOf(credentials) || 'Not assigned'], ['Registered email', credentials.email], ['Temporary password', credentials.temp_password],
    ...(expiry && Number.isFinite(expiry.getTime()) ? [['Expires (Sri Lanka time)', expiry.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' })]] : [])];
  return <View style={styles.container}>
    <Text accessibilityRole="alert" style={{ color: emailSent ? theme.text : theme.accent, lineHeight: 20 }}>{emailSent ? 'These exact sign-in details were emailed to the registered address.' : 'Account saved. Email was not sent. Save these details and retry from the account’s credentials action.'}</Text>
    <View style={[styles.card, { backgroundColor: theme.field, borderColor: theme.line }]}>{fields.map(([label, value]) => <View key={label} style={styles.field}>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text><Text selectable style={{ color: theme.text, fontSize: 14, fontWeight: '600', lineHeight: 21 }}>{value}</Text>
    </View>)}</View>
    <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>Set a permanent password at first sign-in. A replacement credentials request invalidates the previous password.</Text>
  </View>;
}
const styles = StyleSheet.create({ container: { width: '100%', gap: 12, marginBottom: 16 }, card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 14 }, field: { gap: 4 } });
