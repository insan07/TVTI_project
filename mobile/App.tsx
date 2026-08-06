import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from './src/components/shared/Toast';
import OfflineBanner from './src/components/shared/OfflineBanner';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleEl = document.createElement('style');
      styleEl.id = 'expo-web-root-fix';
      styleEl.textContent = `
        html, body, #root, #root > div {
          height: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
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
