import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  // ==========================================
  // CLOUD BACKEND CONFIGURATION
  // ==========================================
  // If you deploy your backend to the cloud (e.g., Vercel, Render, Railway, etc.),
  // uncomment the line below and enter your production backend URL:
  // return 'https://your-deployed-backend-url.com/api';

  // Web browser client check
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }

  // Retrieve the local machine IP from Expo Packager host (works for Expo Go & local dev clients)
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.100:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }

  // Fallback for standard emulators/simulators
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api'; // Android Emulator loopback to host
  }
  return 'http://localhost:5000/api'; // iOS Simulator fallback
};

export const API_URL = getApiUrl();
