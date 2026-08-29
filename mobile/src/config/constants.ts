import { Platform } from 'react-native';

// Set USE_PRODUCTION to true to point the mobile app to your live Vercel backend
const USE_PRODUCTION = true;

// Change DEV_HOST_IP to your PC's Wi-Fi IP address (e.g., '192.168.1.100') when testing locally on physical phones over Wi-Fi
const DEV_HOST_IP = ''; 

const getApiUrl = () => {
  if (USE_PRODUCTION) {
    return 'https://api.twintec.edu.lk/api';
  }
  if (DEV_HOST_IP) {
    return `http://${DEV_HOST_IP}:5000/api`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();

