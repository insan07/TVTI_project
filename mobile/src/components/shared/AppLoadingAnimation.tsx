import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AppLoadingAnimationProps {
  message?: string;
  isDark?: boolean;
}

export default function AppLoadingAnimation({
  message = 'Starting learning portal...',
  isDark = false,
}: AppLoadingAnimationProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Animation values
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial fade-in of logo and typography
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 700,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous breathing pulse on the logo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.95,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 3. Continuous expanding aura ring around the crest
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.45,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    ringLoop.start();

    // 4. Progress bar sweep animation
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressBarAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progressBarAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    progressLoop.start();

    return () => {
      pulseLoop.stop();
      ringLoop.stop();
      progressLoop.stop();
    };
  }, []);

  const progressTranslate = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180],
  });

  const bgColor = isDark ? '#0B0F19' : '#FFFFFF';
  const titleColor = isDark ? '#FFFFFF' : '#0F172A';
  const subtitleColor = isDark ? '#94A3B8' : '#475569';
  const barTrackColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Background Soft Glow */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          {
            backgroundColor: isDark
              ? 'rgba(255, 101, 0, 0.12)'
              : 'rgba(255, 101, 0, 0.08)',
          },
        ]}
      />

      {/* Centered Animated Logo Cluster */}
      <View style={styles.centerBox}>
        <View style={styles.logoWrapper}>
          {/* Pulsing Aura Ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: '#FF6500',
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />

          {/* Logo with Breathing Pulse */}
          <Animated.View
            style={[
              styles.logoInner,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={[styles.logoImage, isDesktop && styles.logoImageDesktop]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Brand Typography */}
        <Animated.View style={[styles.textWrapper, { opacity: textFadeAnim }]}>
          <Text style={[styles.brandTitle, { color: titleColor }]}>
            Twintec VTI
          </Text>
          <Text style={[styles.brandSubtitle, { color: subtitleColor }]}>
            Vocational Training Institute
          </Text>

          {/* Branded Indeterminate Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: barTrackColor }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  transform: [{ translateX: progressTranslate }],
                },
              ]}
            >
              <LinearGradient
                colors={['#FF6500', '#FFA133', '#FF6500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          {/* Loading status text */}
          <Text style={[styles.statusText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            {message}
          </Text>
        </Animated.View>
      </View>

      {/* Footer Tagline */}
      <View style={styles.footerBox}>
        <Text style={[styles.footerText, { color: isDark ? '#475569' : '#A89F93' }]}>
          Empowering Skills • Shaping Futures
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  logoInner: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  logoImageDesktop: {
    width: 104,
    height: 104,
  },
  textWrapper: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13.5,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginBottom: 26,
    textAlign: 'center',
  },
  progressTrack: {
    width: 160,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  progressBar: {
    width: 80,
    height: '100%',
    borderRadius: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  footerBox: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
    zIndex: 2,
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

