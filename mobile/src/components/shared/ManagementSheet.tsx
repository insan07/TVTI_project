import { KeyboardAvoidingView, KeyboardScrollView as ScrollView } from './KeyboardForm';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';

export default function ManagementSheet({ visible, title, backLabel, onClose, children, footer, busy = false }: { visible: boolean; title: string; backLabel: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; busy?: boolean }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={[styles.header, { borderBottomColor: theme.line }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={backLabel} onPress={onClose} disabled={busy} style={styles.back}><Icon name="chevron-back" size={24} color={theme.text} /></TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>{children}</ScrollView>
        {footer && <View style={[styles.footer, { borderTopColor: theme.line }]}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { width: '100%', maxWidth: 720, maxHeight: '94%', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 16, paddingLeft: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, title: { ...FONTS.bold, fontSize: 18, flexShrink: 1 },
  body: { padding: 18, gap: 16 }, footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
});
