import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from './src/components/shared/Toast';
import OfflineBanner from './src/components/shared/OfflineBanner';

import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleEl = document.createElement('style');
      styleEl.id = 'expo-web-root-fix';
      styleEl.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap');

        html, body, #root, input, button, select, textarea, div, p, span, h1, h2, h3, h4, h5, h6 {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* Protect vector icons from being overwritten by global fonts */
        [style*="Ionicons"],
        [style*="ionic"],
        .Ionicons,
        [class*="Ionicons"] {
          font-family: 'Ionicons' !important;
        }

        /* Suppress default browser black focus outlines & native password reveal buttons */
        input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        input::-ms-reveal, input::-ms-clear {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        input::-webkit-contacts-auto-fill-button, input::-webkit-credentials-auto-fill-button {
          visibility: hidden !important;
          display: none !important;
          pointer-events: none !important;
          position: absolute !important;
          right: -9999px !important;
        }

        html, body {
          background-color: #ffffff !important;
          height: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
        }
        #root {
          height: 100% !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          background-color: #ffffff;
        }
        #root > div {
          height: 100% !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
        }
      `;
      if (!document.getElementById('expo-web-root-fix')) {
        document.head.appendChild(styleEl);
      }
    }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" backgroundColor="#ffffff" />
        <AuthProvider>
          <OfflineBanner />
          <AppNavigator />
          <Toast />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
