import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { API_URL } from '../../config/constants';
import { useTheme } from '../../context/ThemeContext';

export default function UserAvatar({ user, size = 40 }: { user?: { name?: string; profile_photo?: string } | null; size?: number }) {
  const { isDark } = useTheme();
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const photo = user?.profile_photo;
  const uri = photo?.startsWith('/') ? `${API_URL.replace(/\/api\/?$/, '')}${photo}` : photo;
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';
  return <View accessibilityLabel={`${user?.name || 'User'} profile photo`} style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#3A281D' : '#FFF0E2' }}>
    {uri && failedPhoto !== photo ? <Image source={{ uri }} style={{ width: size, height: size }} onError={() => setFailedPhoto(photo)} />
      : <Text style={{ color: isDark ? '#FDBA74' : '#9A3412', fontSize: size * 0.36, fontWeight: '700' }}>{initials}</Text>}
  </View>;
}
