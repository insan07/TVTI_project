import { FONT_FAMILY } from './theme';

export const HEADER_THEME = {
  // Main Heading Bar Surface Design (iOS / Stripe / Revolut Executive Standard)
  backgroundColor: '#FFFFFF',
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
  paddingHorizontal: 16,
  paddingVertical: 14,
  elevation: 2,

  // Executive Bold Title Typography (Matching Student Plus Jakarta Sans Font)
  fontFamily: FONT_FAMILY,
  titleFontSize: 19,
  titleLineHeight: 24,
  titleFontWeight: '700' as const,
  titleColor: '#0F172A',
  titleLetterSpacing: -0.3,

  // Crisp Back Navigation Icon (Chevron / Arrow 1:1 Proportional Alignment)
  backIconName: 'chevron-back' as const,
  backIconSize: 21,
  backIconColor: '#0F172A',
  backIconSpacingRight: 8,
  backIconHitSlop: { top: 12, bottom: 12, left: 12, right: 12 },

  // Subheading Control (Disabled as requested)
  showSubtitle: false,
};

