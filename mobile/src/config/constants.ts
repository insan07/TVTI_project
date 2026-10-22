import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Wi-Fi Host IP fallback for physical phone testing
const DEV_HOST_IP = '192.168.150.138';

const extractHostFromUri = (uri?: string | null): string | null => {
  if (!uri) return null;
  // Remove protocol prefix if present (exp://, http://, https://)
  const clean = uri.replace(/^([a-z0-9]+:\/\/)/i, '');
  // Extract host part before port or path
  const host = clean.split(':')[0].split('/')[0].trim();
  if (
    host &&
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    !host.startsWith('192.168.56.') // Exclude VirtualBox virtual network adapters
  ) {
    return host;
  }
  return null;
};

const getDevHostIp = (): string | null => {
  // 1. Dynamic computer IP auto-detection from Expo Metro server URI when running in Expo Go / Dev Client
  const candidateUris = [
    Constants.expoConfig?.hostUri,
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any).manifest?.debuggerHost,
    Constants.linkingUri,
    (Constants as any).experienceUrl,
  ];

  for (const uri of candidateUris) {
    const ip = extractHostFromUri(uri);
    if (ip) {
      return ip;
    }
  }

  // 2. Fallback to hardcoded DEV_HOST_IP if dynamic detection yields nothing
  return DEV_HOST_IP || null;
};

const getApiUrl = () => {
  // 1. Environment Variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Production Web Domain Auto-Detection
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://api.twintec.edu.lk/api';
    }
  }

  // 3. Local Development Auto IP Detection (for Expo Go on physical device)
  const autoIp = getDevHostIp();
  if (autoIp) {
    return `http://${autoIp}:5000/api`;
  }

  // 4. Android Emulator Fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }

  // 5. Default Production API Endpoint
  return 'https://api.twintec.edu.lk/api';
};

export const API_URL = getApiUrl();

if (__DEV__) {
  console.log('[API_URL] Active Backend Endpoint:', API_URL);
}


