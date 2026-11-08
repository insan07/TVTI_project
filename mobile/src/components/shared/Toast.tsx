import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Easing,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

let showToastFn: (msg: string, type?: ToastType) => void;

export function showToast(message: string, type: ToastType = 'success') {
  if (showToastFn) {
    showToastFn(message, type);
  }
}

export default function Toast() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  // Animation references - start sufficiently above any phone taskbar/status bar
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -140,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setVisible(false);
      setMessage('');
    });
  };

  useEffect(() => {
    showToastFn = (msg, msgType = 'success') => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setMessage(msg);
      setType(msgType);
      setVisible(true);

      // Accurately calculate taskbar / status bar clearance
      // Ensures the popup drops strictly below the phone's taskbar without overlapping clock, battery, or notch
      const statusBarHeight =
        Platform.OS === 'android'
          ? Math.max(RNStatusBar.currentHeight || 0, insets.top || 0, 28)
          : Math.max(insets.top || 0, 20);
      const targetY = statusBarHeight + 12;

      // Reset animation values
      translateY.setValue(-140);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: targetY,
          duration: 260,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, 3400);
    };

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [insets.top]);

  if (!visible || !message) return null;

  const isError = type === 'error';
  const isWarning = type === 'warning';
  const iconColor = isError ? '#EF4444' : isWarning ? '#F59E0B' : '#16A34A';
  const iconName = isError ? 'close' : isWarning ? 'alert' : 'checkmark';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={hideToast}
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1E293B' : '#E5E7EB',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        {/* Left circular white badge with checkmark / cross */}
        <View style={styles.iconCircle}>
          <Icon name={iconName} size={12} color={iconColor} />
        </View>

        {/* Status message */}
        <Text
          style={[
            styles.messageText,
            { color: isDark ? '#F1F5F9' : '#1F2937' },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>

        {/* Minimalist close icon */}
        <TouchableOpacity
          onPress={hideToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Icon
            name="close"
            size={13}
            color={isDark ? '#94A3B8' : '#6B7280'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
    paddingHorizontal: 20,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 390,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
        elevation: 8,
      },
    }) as any,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  messageText: {
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 18,
    flexShrink: 1,
    marginRight: 12,
  },
  closeBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
});
