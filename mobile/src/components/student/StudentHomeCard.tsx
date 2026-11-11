import React from 'react';
import { Platform, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { communicationTheme } from '../shared/communicationTheme';

type Props = ViewProps & {
  title: string;
  headerAction?: React.ReactNode;
  variant?: 'default' | 'communication';
};

export default function StudentHomeCard({ title, headerAction, variant = 'default', children, style, ...props }: Props) {
  const { isDark } = useTheme();
  return (
    <View {...props} style={styles.section}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.heading, { color: isDark ? '#FFFFFF' : COLORS.primary }]}>
          {title}
        </Text>
        {headerAction}
      </View>
      <View style={[
        variant === 'communication'
          ? studentCommunicationSurface(isDark)
          : [studentHomeCardStyles.surface, isDark && studentHomeCardStyles.surfaceDark],
        styles.content,
        style,
      ]}>
        {children}
      </View>
    </View>
  );
}

export const studentHomeCardStyles = StyleSheet.create({
  surface: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.80)',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 6px 24px -8px rgba(26, 26, 26, 0.10)' },
      default: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    }),
  },
  surfaceDark: { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.09)' },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  rowDividerDark: { borderTopColor: 'rgba(255, 255, 255, 0.10)' },
});

export function studentCommunicationSurface(isDark: boolean) {
  const theme = communicationTheme(isDark);
  return [
    studentHomeCardStyles.surface,
    styles.communicationSurface,
    { backgroundColor: theme.surface, borderColor: theme.line },
  ];
}

const styles = StyleSheet.create({
  communicationSurface: {
    shadowOpacity: 0,
    elevation: 0,
    ...Platform.select({ web: { boxShadow: 'none' }, default: {} }),
  },
  section: { marginBottom: 24 },
  content: { paddingHorizontal: 18 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 },
  heading: { ...FONTS.bold, fontSize: 18, letterSpacing: -0.3, flex: 1, minWidth: 120 },
});
