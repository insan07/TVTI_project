export const COLORS = {
  primary: '#1A1A1A',       // Black — main brand color (from TVTI logo)
  primaryLight: '#333333',  // Lighter black for accents
  primaryDark: '#000000',   // Pure black for headers
  secondary: '#F58220',     // Orange accent color (from TVTI logo)
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  
  background: '#F5F5F5',    // Light neutral gray background
  surface: '#FFFFFF',       // Card backgrounds
  surfaceAlt: '#FFF3E6',    // Light orange tint for alternate cards
  
  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textMuted: '#999999',
  textOnPrimary: '#FFFFFF',
  
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  
  tabBar: '#FFFFFF',
  tabBarActive: '#F58220',  // Orange active tab (matches brand)
  tabBarInactive: '#999999',
};

export const FONTS = {
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semiBold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
  extraBold: { fontWeight: '800' as const },
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 20, full: 999,
};

export const SHADOW = {
  sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 8 },
};
