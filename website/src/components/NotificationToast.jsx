import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationToast() {
  const { toastNotification, clearToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!toastNotification) return null;

  const handleToastClick = () => {
    if (toastNotification._id) {
      markAsRead(toastNotification._id);
    }
    if (toastNotification.link) {
      navigate(toastNotification.link);
    }
    clearToast();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'announcement':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c.41 0 .789.206 1.018.552l2.366 3.55a1.76 1.76 0 010 1.796l-2.366 3.55a1.18 1.18 0 01-1.018.552H7c-.569 0-1.115-.24-1.564-.667z" />
            </svg>
          </div>
        );
      case 'new_video':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'new_result':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-zinc-900 text-white rounded-2xl p-4 shadow-2xl border border-orange-500/30 animate-bounce-in transition-all">
      <div className="flex items-start space-x-3">
        {getIcon(toastNotification.type)}
        <div className="flex-1 cursor-pointer" onClick={handleToastClick}>
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-bold text-sm text-white line-clamp-1">
              {toastNotification.title}
            </h4>
            <span className="text-[10px] bg-orange-500 text-black font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
              NEW
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-snug">
            {toastNotification.message}
          </p>
          {toastNotification.link && (
            <span className="inline-block text-[11px] text-orange-400 font-semibold mt-2 hover:underline">
              View Details →
            </span>
          )}
        </div>
        <button
          onClick={clearToast}
          className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors focus:outline-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
