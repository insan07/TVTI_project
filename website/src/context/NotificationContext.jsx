import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState(null);
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Helper to fetch current user token & details
  const getAuthToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
  const getCurrentUser = () => {
    try {
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  };

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const unread = data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  }, [API_URL]);

  // Mark single notification read
  const markAsRead = async (id) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  // Mark all read
  const markAllAsRead = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  // Setup Socket.io connection on login/mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    const token = getAuthToken();

    if (!currentUser || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    setUser(currentUser);
    fetchNotifications();

    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('[Socket.io] Connected to notification server');
      if (currentUser._id || currentUser.id) {
        newSocket.emit('join_user', currentUser._id || currentUser.id);
      }
      if (currentUser.role) {
        newSocket.emit('join_role', currentUser.role);
      }
    });

    // Listen for incoming real-time notifications
    newSocket.on('notification', (newNotif) => {
      console.log('[Socket.io] Real-time notification received:', newNotif);

      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Trigger instant screen toast
      setToastNotification(newNotif);

      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setToastNotification((curr) => (curr === newNotif ? null : curr));
      }, 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [API_URL, fetchNotifications]);

  const clearToast = () => setToastNotification(null);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toastNotification,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        clearToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      toastNotification: null,
      markAsRead: () => {},
      markAllAsRead: () => {},
      fetchNotifications: () => {},
      clearToast: () => {},
    };
  }
  return ctx;
};
