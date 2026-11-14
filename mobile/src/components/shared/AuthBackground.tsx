import React, { createContext, useContext, useRef } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const AuthBackdropContext = createContext<React.RefObject<View | null> | undefined>(undefined);
export const useAuthBackdrop = () => useContext(AuthBackdropContext);

/** Each auth screen owns its target, including during stack transitions. */
export function AuthBackdropProvider({ children }: { children: React.ReactNode }) {
  const target = useRef<View | null>(null);
  return <AuthBackdropContext.Provider value={target}>{children}</AuthBackdropContext.Provider>;
}

export default function AuthBackground({ isLight }: { isLight: boolean }) {
  const target = useAuthBackdrop();
  return <BlurTargetView ref={target} pointerEvents="none" style={styles.background}>
    <Image source={isLight ? require('../../../assets/backgroundlight.jpeg') : require('../../../assets/background.jpeg')}
      resizeMode="cover" blurRadius={Platform.OS === 'web' ? 0 : 6}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', transform: [{ scale: 1.04 }] }]} />
    <LinearGradient colors={isLight
      ? ['rgba(255,255,255,0.60)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0.72)']
      : ['rgba(15,23,42,0.94)', 'rgba(20,28,44,0.90)', 'rgba(10,15,26,0.98)']}
      style={StyleSheet.absoluteFill} />
  </BlurTargetView>;
}

const styles = StyleSheet.create({ background: { ...StyleSheet.absoluteFill, overflow: 'hidden' } });
