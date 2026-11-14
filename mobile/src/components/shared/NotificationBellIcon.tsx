import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** A quiet, consistent bell for notification entry points and inbox rows. */
export default function NotificationBellIcon({ size = 22, color = '#1A1A1A' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M9.5 19.5a2.5 2.5 0 0 0 5 0M12 3V1.75M5.75 9a6.25 6.25 0 0 1 12.5 0c0 3.75.65 5.25 1.5 6.5.4.6-.02 1.5-.75 1.5H5c-.73 0-1.15-.9-.75-1.5.85-1.25 1.5-2.75 1.5-6.5Z"
      stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
