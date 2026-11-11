import { COLORS } from '../../config/theme';
import { communicationTheme } from './communicationTheme';

/** Users adopts the schedule's restrained surfaces, borders and orange actions. */
export function usersSectionTheme(isDark: boolean) {
  return {
    ...communicationTheme(isDark),
    background: isDark ? '#101010' : '#FAFAFA',
    surface: isDark ? '#191919' : '#FFFFFF',
    field: isDark ? '#242424' : '#F5F5F5',
    muted: isDark ? '#A3A3A3' : '#737373',
    accent: COLORS.secondary,
    accentSoft: isDark ? 'rgba(245,130,32,0.15)' : '#FFF3E6',
    successSoft: isDark ? 'rgba(245,130,32,0.15)' : '#FFF3E6',
    success: isDark ? '#FB923C' : '#C2410C',
    dangerSoft: isDark ? '#242424' : '#F5F5F5',
    danger: isDark ? '#FB923C' : '#C2410C',
    warningSoft: isDark ? 'rgba(245,130,32,0.15)' : '#FFF3E6',
    warning: isDark ? '#FB923C' : '#C2410C',
  };
}
