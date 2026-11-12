import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

type Props = { message?: string; isDark?: boolean; onReady?: () => void };
export default function AppLoadingAnimation({ message = 'Preparing your learning space', onReady }: Props) {
  const sweep = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { let active = true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }); const event = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion); return () => { active = false; event.remove(); }; }, []);
  useEffect(() => {
    if (reduceMotion) { sweep.setValue(0.5); return; }
    const loop = Animated.loop(Animated.sequence([Animated.timing(sweep, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true })])); loop.start(); return () => loop.stop();
  }, [reduceMotion, sweep]);
  return <View onLayout={onReady} style={styles.screen}>
    <StatusBar style="light" />
    <LinearGradient colors={['#111111', '#1A1714', '#111111']} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={styles.ring} /><View pointerEvents="none" style={styles.topRule} />
    <View style={styles.identity}>
      <Image source={require('../../../assets/logo.png')} accessibilityLabel="Twintec VTI crest" resizeMode="contain" style={styles.logo} />
      <Text style={styles.wordmark}>TWINTEC <Text style={styles.accent}>VTI</Text></Text>
      <Text style={styles.subtitle}>VOCATIONAL TRAINING INSTITUTE</Text>
      <View accessibilityRole="progressbar" accessibilityLabel={message} style={styles.track}><Animated.View style={[styles.sweep, { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-64, 200] }) }] }]} /></View>
      <Text accessibilityLiveRegion="polite" style={styles.status}>{message}</Text>
    </View>
    <View style={styles.footer}><View style={styles.footerRule} /><Text style={styles.tagline}>EMPOWERING SKILLS. SHAPING FUTURES.</Text><Text style={styles.location}>PUTTALAM · SRI LANKA</Text></View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', backgroundColor: '#111111', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  topRule: { position: 'absolute', top: 0, width: '100%', height: 3, backgroundColor: '#F58220' },
  ring: { position: 'absolute', width: 390, height: 390, borderRadius: 195, borderWidth: 1, borderColor: 'rgba(245,130,32,0.07)' },
  identity: { alignItems: 'center', paddingHorizontal: 24, width: '100%', maxWidth: 480, paddingBottom: 24 }, logo: { width: 148, height: 158, marginBottom: 28 }, wordmark: { fontSize: 30, fontWeight: '800', letterSpacing: 1.2, color: '#FAFAFA', textAlign: 'center' }, accent: { color: '#F58220' }, subtitle: { fontSize: 9, fontWeight: '600', color: '#B5B0AA', letterSpacing: 1.5, marginTop: 9, textAlign: 'center' },
  track: { width: 200, height: 3, borderRadius: 2, backgroundColor: '#2A2825', overflow: 'hidden', marginTop: 38 }, sweep: { width: 64, height: '100%', borderRadius: 2, backgroundColor: '#F58220' }, status: { fontSize: 11, color: '#918C86', textAlign: 'center', marginTop: 15 },
  footer: { position: 'absolute', bottom: '6%', alignItems: 'center', paddingHorizontal: 20 }, footerRule: { width: 24, height: 2, backgroundColor: '#F58220', marginBottom: 14 }, tagline: { fontSize: 8, fontWeight: '600', letterSpacing: 1.3, color: '#B5B0AA', textAlign: 'center' }, location: { fontSize: 8, letterSpacing: 1.4, color: '#6E6963', marginTop: 8 },
});
