import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DarkTheme, DefaultTheme, Theme as NavigationTheme } from '@react-navigation/native';
import { storage } from '../utils/storage';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  isReady: boolean;
  toggleTheme: () => Promise<void>;
  navigationTheme: NavigationTheme;
};

const THEME_STORAGE_KEY = 'tvti_theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await storage.getItem(THEME_STORAGE_KEY) || await storage.getItem('tvti_login_theme');
        if (saved === 'light' || saved === 'dark') setMode(saved);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const toggleTheme = useCallback(async () => {
    setMode(current => {
      const next = current === 'light' ? 'dark' : 'light';
      void storage.setItem(THEME_STORAGE_KEY, next);
      void storage.setItem('tvti_login_theme', next);
      return next;
    });
  }, []);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: '#F58220', background: mode === 'dark' ? '#111827' : '#F6F8FC', card: mode === 'dark' ? '#1F2937' : 'rgba(255, 255, 255, 0.84)', text: mode === 'dark' ? '#F9FAFB' : '#1A1A1A', border: mode === 'dark' ? '#374151' : 'rgba(203, 213, 225, 0.72)', notification: '#F58220' } };
  }, [mode]);

  const value = useMemo(() => ({ mode, isDark: mode === 'dark', isReady, toggleTheme, navigationTheme }), [isReady, mode, navigationTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
