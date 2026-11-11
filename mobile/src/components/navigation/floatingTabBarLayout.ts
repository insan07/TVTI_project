// Dock: 44px buttons + 8px scroll padding + 10px container padding.
export const FLOATING_TAB_BAR_HEIGHT = 62;
export const floatingTabBarBottom = (safeBottom: number) => Math.max(safeBottom + 10, 16);
export const floatingTabBarClearance = (safeBottom: number) => floatingTabBarBottom(safeBottom) + FLOATING_TAB_BAR_HEIGHT;
