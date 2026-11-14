import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthBackdrop } from './AuthBackground';

/** Decorative layers stay behind the form and never intercept input. */
export function AuthGlassSurface({ isLight }: { isLight: boolean }) {
  const blurTarget = useAuthBackdrop();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Web blur lives on the card so the backdrop is filtered only once. */}
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={70}
          blurTarget={blurTarget}
          blurMethod={blurTarget ? 'dimezisBlurView' : 'none'}
          tint={isLight ? 'light' : 'dark'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={isLight
          ? ['rgba(255, 255, 255, 0.44)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.18)']
          : ['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.01)', 'rgba(255, 179, 115, 0.06)']}
        locations={[0, 0.48, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.62)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topRim}
      />
      <LinearGradient
        colors={[isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.32)', 'transparent']}
        style={styles.sideRim}
      />
    </View>
  );
}

export const authGlassStyles = StyleSheet.create({
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(28px) saturate(165%)',
        WebkitBackdropFilter: 'blur(28px) saturate(165%)',
        boxShadow: '0 24px 64px -16px rgba(15, 23, 42, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(255, 255, 255, 0.38)',
      },
      default: {},
    }),
  },
  dark: {
    backgroundColor: 'rgba(20, 27, 38, 0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.48,
    shadowRadius: 32,
    elevation: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(28px) saturate(165%)',
        WebkitBackdropFilter: 'blur(28px) saturate(165%)',
        boxShadow: '0 28px 68px -16px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.30), inset 0 -1px 0 rgba(255, 255, 255, 0.07)',
      },
      default: {},
    }),
  },
  inputLight: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderColor: 'rgba(148, 163, 184, 0.44)',
    borderWidth: 1.1,
    ...Platform.select({
      web: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.80), 0 2px 5px rgba(15, 23, 42, 0.03)' },
      default: {},
    }),
  },
  inputDark: {
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.1,
    ...Platform.select({
      web: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.07)' },
      default: {},
    }),
  },
  inputFocusedLight: {
    borderColor: '#FF5E14',
    backgroundColor: 'rgba(255, 255, 255, 0.56)',
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(255, 94, 20, 0.14)' },
      default: {},
    }),
  },
  inputFocusedDark: {
    borderColor: '#FF5E14',
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(255, 94, 20, 0.20)' },
      default: {},
    }),
  },
});

const styles = StyleSheet.create({
  topRim: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
  },
  sideRim: {
    position: 'absolute',
    top: 22,
    bottom: 22,
    left: 0,
    width: 1,
  },
});
