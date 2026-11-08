import { FONT_FAMILY } from './theme';

export const HEADER_THEME = {
  // Main Heading Embedded Surface Design (Seamlessly integrated into background screen)
  backgroundColor: 'transparent',
  borderBottomWidth: 0,
  borderBottomColor: 'transparent',
  paddingHorizontal: 20,
  paddingVertical: 8,
  elevation: 0,

  // Executive Bold Title Typography (Matching Student Plus Jakarta Sans Font)
  fontFamily: FONT_FAMILY,
  titleFontSize: 22,
  titleLineHeight: 28,
  titleFontWeight: '700' as const,
  titleColor: '#0F172A',
  titleLetterSpacing: -0.4,

  // Crisp Back Navigation Icon
  backIconName: 'chevron-back' as const,
  backIconSize: 22,
  backIconColor: '#0F172A',
  backIconSpacingRight: 10,
  backIconHitSlop: { top: 12, bottom: 12, left: 12, right: 12 },

  // Subheading Control
  showSubtitle: false,
};

