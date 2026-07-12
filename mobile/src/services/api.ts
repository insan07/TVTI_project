import axios from 'axios';
import { storage } from '../utils/storage';
import { showToast } from '../components/shared/Toast';
import { DeviceEventEmitter } from 'react-native';
import { API_URL } from '../config/constants';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      // Network error
      showToast('No internet connection', 'error');
    } else if (error.response.status === 401) {
      const isAuthRequest = error.config && error.config.url && error.config.url.includes('auth');
      if (!isAuthRequest) {
        await storage.removeItem('token');
        await storage.removeItem('user');
        showToast('Session expired. Please log in again.', 'error');
        DeviceEventEmitter.emit('session_expired');
      }
      // Navigation state will reset if context listens to token removal
    } else if (error.response.status >= 500) {
      showToast('A server error occurred. Please try again.', 'error');
    }
    return Promise.reject(error);
  }
);

export default api;
