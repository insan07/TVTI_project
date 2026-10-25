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
          StyleSheet.absoluteFill,
          Platform.OS === 'web' && ({
            position: 'fixed',
            width: '100vw',
            height: '100vh',
            zIndex: -2,
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: isLight ? 0.55 : 0.45,
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
              zIndex: -1,
              pointerEvents: 'none',
              background: isLight
                ? 'linear-gradient(to bottom, rgba(248, 250, 252, 0.85) 0%, rgba(248, 250, 252, 0.72) 45%, rgba(248, 250, 252, 0.88) 100%)'
                : 'linear-gradient(to bottom, rgba(15, 23, 42, 0.94) 0%, rgba(20, 28, 44, 0.88) 50%, rgba(10, 15, 26, 0.97) 100%)',
            } as any,
          ]}
        />
      ) : (
        <LinearGradient
          colors={
            isLight
              ? ['rgba(248, 250, 252, 0.85)', 'rgba(248, 250, 252, 0.72)', 'rgba(248, 250, 252, 0.88)']
              : ['rgba(15, 23, 42, 0.94)', 'rgba(20, 28, 44, 0.88)', 'rgba(10, 15, 26, 0.97)']
          }
          style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
        />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
});
