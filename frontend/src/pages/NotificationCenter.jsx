import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Loader2, Check, CheckSquare, ArrowRight,
  AlertCircle, Cpu, FileText, AlertTriangle, CreditCard, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import notificationService from '../services/notificationService';

const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'unread'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await notificationService.getNotifications(currentPage, 10, searchTerm);
      if (response && response.status === 'success') {
        let list = response.data || [];
        
        // Filter locally if 'unread' tab is active (or backend filter can be refined)
        if (filterTab === 'unread') {
          list = list.filter(n => !n.isRead);
        }

        setNotifications(list);
        setTotalPages(response.pagination?.pages || 1);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to retrieve notification logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentPage, filterTab]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchNotifications();
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleMarkRead = async (id) => {
    try {
      setError('');
      setSuccess('');
      await notificationService.markAsRead(id);
      
      // Update local state
      setNotifications(prev => prev.map(item => {
        if (item._id === id) {
          return { ...item, isRead: true };
        }
        return item;
      }));

      // If on unread tab, remove it from list
      if (filterTab === 'unread') {
        setNotifications(prev => prev.filter(item => item._id !== id));
      }
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setError('');
      setSuccess('');
      await notificationService.markAllAsRead();
      setSuccess('All notifications marked as read.');
      fetchNotifications();
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications as read.');
    }
  };

  const handleOpenRecord = (item) => {
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'OCR':
        return <Cpu className="h-5 w-5 text-indigo-500" />;
      case 'Validation':
        return <CheckSquare className="h-5 w-5 text-blue-500" />;
      case 'Exception':
        return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      case 'Payment':
        return <CreditCard className="h-5 w-5 text-purple-650" />;
      default:
        return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6" id="notification-center-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="h-8 w-8 text-brand-650" />
            Notification Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track operational updates, extraction alerts, validations, exceptions, and audit logs.
          </p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.98]"
            id="center-mark-all-read-btn"
          >
            <CheckSquare className="h-4.5 w-4.5" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Action Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="success-alert">
          <Check className="h-5 w-5 shrink-0 text-emerald-505 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs and Search Filters */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Tabs */}
        <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setFilterTab('all'); setCurrentPage(1); }}
            className={`px-4.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterTab === 'all'
                ? 'bg-white text-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-805'
            }`}
            id="tab-all-notifications"
          >
            All Alerts
          </button>
          <button
            onClick={() => { setFilterTab('unread'); setCurrentPage(1); }}
            className={`px-4.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterTab === 'unread'
                ? 'bg-white text-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-805'
            }`}
            id="tab-unread-notifications"
          >
            Unread
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search alerts by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold"
          />
        </div>
      </div>

      {/* Notification Listings */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-10 w-10 text-brand-605 animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading alerts workspace...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
            <Bell className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Notifications</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm 
              ? 'No notifications match your current search parameters.' 
              : 'You have no registered notifications at the moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-slate-150/70 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            {notifications.map((item) => (
              <div 
                key={item._id}
                className={`group flex flex-col md:flex-row md:items-center justify-between p-5 transition-all gap-4 ${
                  !item.isRead ? 'bg-brand-50/20 hover:bg-brand-50/30' : 'hover:bg-slate-50/50'
                }`}
                id={`notification-item-${item._id}`}
              >
                {/* Visual Details */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="p-2 bg-slate-100 group-hover:bg-white border border-slate-200 rounded-xl transition-colors shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{item.title}</h3>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold font-mono">
                        {item.type}
                      </span>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-slate-505 text-xs font-semibold leading-relaxed max-w-3xl">{item.message}</p>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Received On: {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="flex items-center gap-2 justify-end md:shrink-0">
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkRead(item._id)}
                      className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-250 transition-colors"
                      title="Mark as Read"
                      id={`mark-read-center-btn-${item._id}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Mark Read</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenRecord(item)}
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl text-xs font-bold border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-250 transition-colors shadow-sm"
                    id={`open-record-center-btn-${item._id}`}
                  >
                    <span>Open Related Record</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border border-slate-200 bg-white px-6 py-4.5 rounded-2xl shadow-sm">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-350 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-450">
                Page <span className="font-extrabold text-slate-805">{currentPage}</span> of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-350 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
