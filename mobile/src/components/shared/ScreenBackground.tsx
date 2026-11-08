import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface ScreenBackgroundProps {
  children?: React.ReactNode;
}

export default function ScreenBackground({ children }: ScreenBackgroundProps) {
  const { isDark } = useTheme();
  const isLight = !isDark;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* TVTI Campus Building Background Image */}
      <Image
        source={
          isLight
            ? require('../../../assets/backgroundlight.jpeg')
            : require('../../../assets/background.jpeg')
        }
        style={[
          styles.image,
          { opacity: isLight ? 0.32 : 0.22 },
          Platform.OS === 'web' && ({
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: isLight ? 'blur(3px)' : 'none',
            transform: isLight ? 'scale(1.03)' : 'none',
          } as any),
        ]}
        resizeMode="cover"
      />

      {/* Atmospheric Overlays */}
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              position: 'fixed',
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none',
              background: isLight
                ? 'linear-gradient(to bottom, rgba(248, 250, 252, 0.82) 0%, rgba(248, 250, 252, 0.78) 45%, rgba(248, 250, 252, 0.86) 100%)'
                : 'linear-gradient(to bottom, rgba(15, 23, 42, 0.88) 0%, rgba(20, 28, 44, 0.88) 50%, rgba(10, 15, 26, 0.88) 100%)',
            } as any,
          ]}
        />
      ) : (
        <LinearGradient
          colors={
            isLight
              ? ['rgba(248, 250, 252, 0.82)', 'rgba(241, 245, 249, 0.78)', 'rgba(248, 250, 252, 0.88)']
              : ['rgba(15, 23, 42, 0.88)', 'rgba(20, 28, 44, 0.85)', 'rgba(10, 15, 26, 0.94)']
          }
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});
