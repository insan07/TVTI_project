import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader, { ScreenHeaderProps } from './ScreenHeader';

/** The Uploads/Schedule heading, with the same top inset on every main page. */
export default function MainPageHeader({ safeAreaHandled = false, showBack = false, ...props }: ScreenHeaderProps & { safeAreaHandled?: boolean }) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top + 4, 10) - (safeAreaHandled ? insets.top : 0);
  return <View testID="main-page-header" style={{ paddingTop }}>
    <ScreenHeader {...props} showBack={showBack} plainBack />
  </View>;
}
