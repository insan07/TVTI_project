import { KeyboardAvoidingView, KeyboardScrollView as ScrollView, KeyboardTextInput as TextInput } from './KeyboardForm';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';
import { ScrollControlsFocusContext } from './ScrollAwareControls';

export function ManagementButton({ title, onPress, secondary = false, busy = false, disabled = false, accessibilityLabel }: { title: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean; accessibilityLabel?: string }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={[managementStyles.button, { backgroundColor: secondary ? theme.field : theme.accent, opacity: disabled ? 0.5 : 1 }]}>
    {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[managementStyles.buttonText, { color: secondary ? theme.text : '#FFFFFF' }]}>{title}</Text>}
  </TouchableOpacity>;
}
export function ManagementField({ label, value, onChangeText, placeholder, numeric = false, multiline = false, hint }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; numeric?: boolean; multiline?: boolean; hint?: string }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  return <View style={managementStyles.fieldGroup}><Text style={[managementStyles.label, { color: theme.text }]}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.muted}
      keyboardType={numeric ? 'decimal-pad' : 'default'} multiline={multiline} style={[managementStyles.input, { color: theme.text, borderColor: theme.line, backgroundColor: theme.field }, multiline && { minHeight: 92, textAlignVertical: 'top' }]} />
    {!!hint && <Text style={[managementStyles.hint, { color: theme.muted }]}>{hint}</Text>}
  </View>;
}
export function ManagementSearch({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  const scrollFocus = useContext(ScrollControlsFocusContext);
  return <View style={[managementStyles.search, { borderColor: theme.line, backgroundColor: theme.surface }]}><Icon name="search-outline" size={18} color={theme.muted} />
    <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} onFocus={scrollFocus?.onFocus} onBlur={scrollFocus?.onBlur} placeholder={placeholder} placeholderTextColor={theme.muted} style={[managementStyles.searchInput, { color: theme.text }]} />
    {!!value && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} style={managementStyles.iconButton}><Icon name="close" size={18} color={theme.muted} /></TouchableOpacity>}
  </View>;
}
/** A single bordered container, with the title and actions inside like schedule slots. */
export function ManagementCard({ title, headerAction, children }: { title: string; headerAction?: React.ReactNode; children: React.ReactNode }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  return <View style={[managementStyles.recordCard, { backgroundColor: theme.surface, borderColor: theme.line }]}>
    <View style={managementStyles.recordHeader}>
      <Text accessibilityRole="header" style={[managementStyles.recordTitle, { color: theme.text }]}>{title}</Text>
      {!!headerAction && <View style={managementStyles.recordHeaderAction}>{headerAction}</View>}
    </View>
    {children}
  </View>;
}
export function ManagementSearchFilters({ value, onChangeText, placeholder, status, onStatusChange, options, label }: {
  value: string; onChangeText: (value: string) => void; placeholder: string;
  status: string; onStatusChange: (value: string) => void; label: string;
  options: { label: string; value: string; count?: number }[];
}) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark); const [open, setOpen] = useState(false);
  const current = options.find(option => option.value === status);
  const choose = (next: string) => { onStatusChange(next); setOpen(false); };
  return <>
    <View style={managementStyles.searchFilterRow}>
      <View style={managementStyles.grow}><ManagementSearch value={value} onChangeText={onChangeText} placeholder={placeholder} /></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityHint={`Current status: ${current?.label || 'All'}`} accessibilityState={{ expanded: open }} aria-expanded={open}
        onPress={() => setOpen(true)} style={[managementStyles.statusFilterButton, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Icon name="options-outline" size={20} color={status === 'all' ? theme.text : theme.accent} />
        {status !== 'all' && <View style={managementStyles.filterDot} />}
      </TouchableOpacity>
    </View>
    <ManagementSheet visible={open} title={label} onClose={() => setOpen(false)} footer={<ManagementButton title="Reset filters" secondary onPress={() => choose('all')} />}>
      {options.map(option => <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} aria-checked={status === option.value} accessibilityState={{ checked: status === option.value }} onPress={() => choose(option.value)} style={[managementStyles.statusOption, { borderColor: theme.line }]}>
        <Text style={[managementStyles.copy, managementStyles.grow, { color: status === option.value ? theme.accent : theme.text }]}>{option.label}</Text>
        {option.count !== undefined && <Text style={[managementStyles.copy, { color: theme.muted }]}>{option.count}</Text>}
        <Icon name={status === option.value ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={status === option.value ? theme.accent : theme.muted} />
      </TouchableOpacity>)}
    </ManagementSheet>
  </>;
}
export function ManagementPills({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (value: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={managementStyles.filters}>{options.map(option => <TouchableOpacity key={option.value} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={[managementStyles.filter, value === option.value && managementStyles.filterActive]}>
    <Text style={[managementStyles.filterText, value === option.value && { color: '#FFFFFF' }]}>{option.label}</Text>
  </TouchableOpacity>)}</ScrollView>;
}
export function ManagementEmpty({ title, message, retry }: { title: string; message: string; retry?: () => void }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  return <View style={managementStyles.empty}><Icon name={retry ? 'cloud-offline-outline' : 'layers-outline'} size={32} color={theme.accent} /><Text style={[managementStyles.emptyTitle, { color: theme.text }]}>{title}</Text><Text style={[managementStyles.copy, { color: theme.muted, textAlign: 'center' }]}>{message}</Text>{!!retry && <ManagementButton title="Try again" secondary onPress={retry} />}</View>;
}
export function ManagementSheet({ visible, title, busy = false, onClose, footer, children, overlay, spaced = false }: { visible: boolean; title: string; busy?: boolean; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode; overlay?: React.ReactNode; spaced?: boolean }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark); const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[managementStyles.scrim, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
      <View accessibilityViewIsModal style={[managementStyles.sheet, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={[managementStyles.sheetHeader, { borderBottomColor: theme.line }]}><Text accessibilityRole="header" style={[managementStyles.sheetTitle, { color: theme.text }]}>{title}</Text><TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={managementStyles.iconButton}><Icon name="close" size={22} color={theme.text} /></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[managementStyles.sheetContent, spaced && { gap: 12 }]}>{children}</ScrollView>
        {!!footer && <View style={[managementStyles.footer, { borderTopColor: theme.line }]}>{footer}</View>}
        {overlay}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export const managementStyles = StyleSheet.create({
  page: { flex: 1 }, content: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 20 },
  controls: { paddingBottom: 12, gap: 10 }, search: { borderWidth: 1, borderRadius: 12, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusFilterButton: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1 },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: 3, backgroundColor: '#F58220' },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  recordCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10, gap: 10 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, recordHeaderAction: { marginVertical: -10 }, recordTitle: { ...FONTS.bold, fontSize: 16.5, lineHeight: 23, flex: 1, minWidth: 0 }, recordContent: { gap: 10 },
  searchInput: { ...FONTS.regular, minHeight: 44, fontSize: 13, flex: 1, minWidth: 0 }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 6 }, filter: { minHeight: 34, borderWidth: 1, borderColor: '#1A1A1A', backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, justifyContent: 'center' },
  filterActive: { backgroundColor: '#1A1A1A' }, filterText: { ...FONTS.medium, fontSize: 12, color: '#1A1A1A' },
  copy: { ...FONTS.regular, fontSize: 13, lineHeight: 20 }, title: { ...FONTS.semiBold, fontSize: 16, lineHeight: 23 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, between: { justifyContent: 'space-between' }, grow: { flex: 1, minWidth: 0 },
  cardContent: { paddingVertical: 14, gap: 12 }, divider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  metrics: { flexDirection: 'row', gap: 12, paddingVertical: 14 }, metric: { flex: 1, minWidth: 0 }, metricValue: { ...FONTS.bold, fontSize: 22 }, metricLabel: { ...FONTS.regular, fontSize: 11, marginTop: 3 },
  badge: { ...FONTS.medium, fontSize: 11, textTransform: 'capitalize', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  link: { ...FONTS.semiBold, color: '#F58220', fontSize: 13 }, button: { minHeight: 46, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }, buttonText: { ...FONTS.semiBold, fontSize: 13 },
  fab: { position: 'absolute', right: 22, width: 54, height: 54, borderRadius: 27, backgroundColor: '#F58220', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#F58220', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  empty: { alignItems: 'center', padding: 24, gap: 12 }, emptyTitle: { ...FONTS.semiBold, fontSize: 16, textAlign: 'center' },
  fieldGroup: { marginBottom: 16 }, label: { ...FONTS.semiBold, fontSize: 13, marginBottom: 8 }, input: { ...FONTS.regular, minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 }, hint: { ...FONTS.regular, fontSize: 11, lineHeight: 17, marginTop: 6 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 12 }, sheet: { width: '100%', maxWidth: 680, maxHeight: '100%', flexShrink: 1, alignSelf: 'center', borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth }, sheetTitle: { ...FONTS.bold, flex: 1, fontSize: 18 }, sheetContent: { padding: 20 }, footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
