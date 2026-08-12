import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    if (!notif.is_read && notif._id) {
      markAsRead(notif._id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
    setIsOpen(false);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-brand-charcoal hover:text-brand-orange hover:bg-brand-light rounded-full focus:outline-none transition-all border border-black/5"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Dynamic Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-brand-orange text-white text-[10px] font-extrabold items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-black/10 z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-black text-white">
            <div className="flex items-center space-x-2">
              <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-brand-orange text-black font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {unreadCount} UNREAD
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-orange hover:underline font-semibold focus:outline-none"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id || Math.random()}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-orange-50/50 cursor-pointer transition-colors flex items-start space-x-3 ${
                    !notif.is_read ? 'bg-orange-50/30' : ''
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      !notif.is_read ? 'bg-brand-orange' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-bold text-gray-900 truncate ${
                          !notif.is_read ? 'font-extrabold' : ''
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-snug">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
            <span className="text-[11px] text-gray-500 font-medium">
              TVTI Real-Time Notification System
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
