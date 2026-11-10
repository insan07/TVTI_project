import { COLORS } from '../../config/theme';

export const COMMUNICATION_ACCENT = COLORS.secondary;

export function communicationTheme(isDark: boolean) {
  return isDark ? {
    background: '#121212',
    surface: '#1A1A1A',
    text: '#FAFAFA',
    muted: '#A3A3A3',
    line: 'rgba(255, 255, 255, 0.12)',
  } : {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: COLORS.primary,
    muted: '#737373',
    line: 'rgba(26, 26, 26, 0.10)',
  };
}
