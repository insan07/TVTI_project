import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';

export default function ManagementFilterBar({ items, value, onChange }: { items: { value: string; label: string; count: number }[]; value: string; onChange: (value: any) => void }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bar} contentContainerStyle={styles.content}>
    {items.map(item => <TouchableOpacity key={item.value} accessibilityRole="button" accessibilityState={{ selected: value === item.value }} hitSlop={5} onPress={() => onChange(item.value)}
      style={[styles.button, { backgroundColor: value === item.value ? '#171717' : theme.surface, borderColor: value === item.value ? '#171717' : theme.line }]}>
      <Text style={[styles.text, { color: value === item.value ? '#FFFFFF' : theme.text }]}>{item.label} ({item.count})</Text>
    </TouchableOpacity>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  bar: { flexGrow: 0 }, content: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  button: { minHeight: 34, paddingHorizontal: 13, paddingVertical: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, justifyContent: 'center' },
  text: { ...FONTS.medium, fontSize: 12, lineHeight: 18 },
});
