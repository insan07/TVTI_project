import { Platform } from 'react-native';

const getApiUrl = () => {
  // Android Emulator loopback to local host backend
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  // PC web browsers, iOS simulators, and general local fallback
  return 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();
