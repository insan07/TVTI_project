import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';

type Props = {
  visible: boolean; title: string; message: string;
  type?: 'success' | 'error' | 'danger' | 'warning' | 'lock' | 'info';
  confirmText?: string; cancelText?: string; onConfirm: () => void; onCancel?: () => void; busy?: boolean;
};

/** The centered acknowledgement/confirmation structure used by the schedule. */
export default function ManagementDialog({ visible, title, message, type = 'info', confirmText = 'OK', cancelText = 'Cancel', onConfirm, onCancel, busy = false }: Props) {
  const { isDark } = useTheme();
  const theme = usersSectionTheme(isDark);
  const danger = type === 'danger' || type === 'error';
  const color = COLORS.secondary;
  const icon = danger ? 'alert-circle-outline' : type === 'success' ? 'checkmark-circle-outline' : type === 'lock' ? 'lock-closed-outline' : type === 'warning' ? 'warning-outline' : 'information-circle-outline';
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) (onCancel || onConfirm)(); }}>
    <View style={styles.overlay}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}><Icon name={icon} size={28} color={color} /></View>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text accessibilityRole="alert" style={[styles.message, { color: theme.muted }]}>{message}</Text>
        <View style={styles.actions}>
          {!!onCancel && <TouchableOpacity accessibilityRole="button" accessibilityLabel={cancelText} disabled={busy} onPress={onCancel}
            style={[styles.button, { backgroundColor: theme.field, borderColor: theme.line }]}><Text style={[styles.buttonText, { color: theme.text }]}>{cancelText}</Text></TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={confirmText} accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onConfirm}
            style={[styles.button, { backgroundColor: danger && !isDark ? '#1A1A1A' : COLORS.secondary, borderColor: 'transparent' }]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{confirmText}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { padding: 24, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, width: '100%', maxWidth: 380, alignItems: 'center' },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { ...FONTS.bold, fontSize: 18, textAlign: 'center', marginBottom: 8 },
  message: { ...FONTS.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10, width: '100%' }, button: { flex: 1, minHeight: 48, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...FONTS.bold, fontSize: 14, textAlign: 'center' },
});
