import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SiteSettingsContext = createContext();

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    site_title: 'Twintec VTI',
    announcement_banner: 'Admissions are OPEN for 2026 batches! Register now to secure your seat.',
    show_announcement: true,
    contact_phone: '076 538 0715 / 078 538 0715',
    contact_email: 'info@twintec.edu.lk',
    whatsapp_number: '+94771234567',
    address: 'Mannar Road, Puttalam, Sri Lanka',
    registration_open: true,
    maintenance_mode: false,
    maintenance_message: 'The website is currently undergoing scheduled maintenance. Please check back shortly.',
  });

  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          ...data,
        }));
      }
    } catch (err) {
      console.log('Failed to load live site settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // Poll settings every 30 seconds for real-time live site updates
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refetchSettings: fetchSettings }}>
      {settings.maintenance_mode && (
        <div className="bg-red-600 text-white font-heading font-bold text-xs py-2 px-4 text-center z-100 flex items-center justify-center space-x-2 shadow-md">
          <svg className="w-4 h-4 text-yellow-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>MAINTENANCE MODE ACTIVE: {settings.maintenance_message}</span>
        </div>
      )}
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
