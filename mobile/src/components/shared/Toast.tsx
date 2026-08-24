import React, { useState, useEffect } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let showToastFn: (msg: string, type?: 'success' | 'error') => void;

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (showToastFn) {
    showToastFn(message, type);
  }
}

export default function Toast() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error'>('success');
  const slideAnim = useState(new Animated.Value(-150))[0];
  const insets = useSafeAreaInsets();

  useEffect(() => {
    showToastFn = (msg, msgType = 'success') => {
      setMessage(msg);
      setType(msgType);
      
      // Reset animation
      slideAnim.setValue(-150);
      
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: Math.max(insets.top, 20), duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(3000),
        Animated.timing(slideAnim, { toValue: -150, duration: 300, useNativeDriver: Platform.OS !== 'web' })
      ]).start(() => {
        setMessage('');
      });
    };
  }, []);

  if (!message) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateY: slideAnim }], 
          backgroundColor: type === 'error' ? '#EF4444' : '#10B981' 
        }
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    zIndex: 2000,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }) as any,
  },
  text: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
