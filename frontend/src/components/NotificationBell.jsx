import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

const NotificationBell = ({ unreadCount = 0, onClick }) => {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (unreadCount > 0) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all focus:outline-none"
      id="bell-notification-btn"
    >
      <Bell 
        className={`h-5 w-5 transition-transform ${
          shake ? 'animate-[bounce_0.5s_ease-in-out_infinite] text-rose-500' : ''
        }`} 
      />
      {unreadCount > 0 && (
        <span 
          className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white border border-white shadow-sm"
          id="unread-badge-count"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
