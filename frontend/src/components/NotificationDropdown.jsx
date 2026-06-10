import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckSquare, FileText, Cpu, AlertTriangle, CreditCard, Info } from 'lucide-react';

const NotificationDropdown = ({ 
  notifications = [], 
  onClose, 
  onMarkRead, 
  onMarkAllRead 
}) => {
  const navigate = useNavigate();

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'OCR':
        return <Cpu className="h-4 w-4 text-indigo-500" />;
      case 'Validation':
        return <CheckSquare className="h-4 w-4 text-blue-500" />;
      case 'Exception':
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case 'Payment':
        return <CreditCard className="h-4 w-4 text-purple-650" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  const handleItemClick = (item) => {
    onMarkRead(item._id);
    onClose();

    // Route based on entity
    if (item.entityType === 'Invoice' && item.entityId) {
      navigate(`/workspace/${item.entityId}`);
    } else if (item.type === 'Exception') {
      navigate('/exceptions');
    } else if (item.type === 'Payment') {
      navigate('/payment-workbench');
    } else {
      navigate('/dashboard');
    }
  };

  const handleMarkReadClick = (e, id) => {
    e.stopPropagation();
    onMarkRead(id);
  };

  const handleViewAllClick = () => {
    onClose();
    navigate('/notifications');
  };

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      
      {/* Dropdown Container */}
      <div 
        className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-fade-in text-slate-800"
        id="notification-dropdown-container"
      >
        {/* Header */}
        <div className="px-4.5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unread Alerts ({notifications.length})</span>
          {notifications.length > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[10px] text-brand-650 hover:text-brand-500 font-extrabold flex items-center gap-1 transition-colors"
              id="dropdown-mark-all-read"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* List */}
        <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto" id="dropdown-notifications-list">
          {notifications.length === 0 ? (
            <div className="px-4.5 py-8 text-center text-slate-400 text-xs">
              All caught up! No unread notifications.
            </div>
          ) : (
            notifications.slice(0, 5).map((item) => (
              <div
                key={item._id}
                onClick={() => handleItemClick(item)}
                className="group flex items-start gap-3.5 p-4 hover:bg-slate-50/70 cursor-pointer transition-colors text-left"
              >
                {/* Icon wrapper */}
                <div className="p-1.5 bg-slate-100 group-hover:bg-white rounded-lg border border-slate-200 transition-colors shrink-0">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-extrabold text-slate-800 text-xs truncate">{item.title}</span>
                    <span className="text-[9px] text-slate-400 font-semibold whitespace-nowrap shrink-0">{formatTimeAgo(item.createdAt)}</span>
                  </div>
                  <p className="text-slate-505 text-[11px] leading-relaxed mt-0.5 line-clamp-2">{item.message}</p>
                </div>

                {/* Quick actions */}
                <button
                  onClick={(e) => handleMarkReadClick(e, item._id)}
                  className="p-1 text-slate-350 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all shrink-0"
                  title="Mark as Read"
                  id={`mark-read-dropdown-btn-${item._id}`}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* View all footer */}
        <button
          onClick={handleViewAllClick}
          className="w-full text-center py-3 border-t border-slate-150 text-xs font-bold text-brand-650 hover:text-brand-500 hover:bg-slate-50 transition-colors bg-white"
          id="dropdown-view-all-btn"
        >
          View All Notifications
        </button>
      </div>
    </>
  );
};

export default NotificationDropdown;
