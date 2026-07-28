import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import axios from 'axios';
import { registerForPushNotificationsAsync } from '../services/NotificationService';
import { DeviceEventEmitter } from 'react-native';
import api from '../services/api';

export type UserRole = 'student' | 'instructor' | 'admin' | null;

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  index_number?: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  userToken: string | null;
  userRole: UserRole; // Exposing for backward compatibility with AppNavigator
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_URL as BASE_API_URL } from '../config/constants';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const restoreToken = async () => {
      try {
        const storedToken = await storage.getItem('token');
        const userJson = await storage.getItem('user');
        
        if (storedToken && userJson) {
          setToken(storedToken);
          setUser(JSON.parse(userJson));
          // Attach token to axios and api global headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (e) {
        console.warn('Failed to restore token', e);
      } finally {
        setLoading(false);
      }
    };
    restoreToken();

    const listener = DeviceEventEmitter.addListener('session_expired', () => {
      setToken(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['Authorization'];
    });

    return () => {
      listener.remove();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { token: apiToken, ...userData } = response.data;
      
      await storage.setItem('token', apiToken);
      await storage.setItem('user', JSON.stringify(userData));
      
      setToken(apiToken);
      setUser(userData);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
      api.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;

      // Register for Push Notifications
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await api.put('/users/push-token', { push_token: pushToken });
        }
      } catch (err) {
        console.warn('Push token registration failed', err);
      }
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await storage.removeItem('token');
      await storage.removeItem('user');
      
      setToken(null);
      setUser(null);
      
      delete axios.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserState = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      storage.setItem('user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userToken: token, // exposed as userToken to prevent breaking AppNavigator
        userRole: user?.role || null, 
        isLoading, 
        login, 
        logout,
        setUser: updateUserState
      }}>
      {children}
    </AuthContext.Provider>
  );
};
