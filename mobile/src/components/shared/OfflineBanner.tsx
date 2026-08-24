import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const [isConnected, setIsConnected] = useState(true);
  const slideAnim = useState(new Animated.Value(-100))[0];
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isConnected ? -100 : 0,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isConnected]);

  if (isConnected) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }], paddingTop: Math.max(insets.top, 20) }]}>
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F59E0B',
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  text: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
