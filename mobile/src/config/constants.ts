import { Platform } from 'react-native';

// Change DEV_HOST_IP to your PC's Wi-Fi IP address (e.g., '192.168.1.100') when testing on physical mobile phones over Wi-Fi!
const DEV_HOST_IP = ''; // e.g. '192.168.1.100'

const getApiUrl = () => {
  // 1. Environment Variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Production Web Domain Auto-Detection (Vercel / lms.twintec.edu.lk)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://api.twintec.edu.lk/api';
    }
  }

  // 3. Local Development Fallbacks
  if (DEV_HOST_IP) {
    return `http://${DEV_HOST_IP}:5000/api`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }

  // 4. Default Production API Endpoint
  return 'https://api.twintec.edu.lk/api';
};

export const API_URL = getApiUrl();
