import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, LayoutDashboard, FileSpreadsheet, 
  Settings, Menu, X, Bell, LogOut, ChevronDown, Cpu, RefreshCw, AlertTriangle, CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import NotificationDropdown from '../components/NotificationDropdown.jsx';
import notificationService from '../services/notificationService.js';
import invoiceService from '../services/invoiceService.js';
import { apiClient } from '../services/authService.js';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeExceptionsCount, setActiveExceptionsCount] = useState(0);
  const [readyForPaymentCount, setReadyForPaymentCount] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const fetchCounts = async () => {
    if (!user) return;
    try {
      // 1. Fetch unread notifications
      const notifRes = await notificationService.getUnreadNotifications();
      if (notifRes && notifRes.status === 'success') {
        setUnreadNotifications(notifRes.data || []);
        setUnreadCount(notifRes.count || 0);
      }

      // 2. Fetch exceptions (only for roles !== Employee)
      if (user.role !== 'Employee') {
        const excRes = await apiClient.get('/exceptions');
        if (excRes.data?.data) {
          const active = excRes.data.data.filter(ex => ex.status !== 'Closed');
          setActiveExceptionsCount(active.length);
        }

        // 3. Fetch ready for payment invoices
        const invRes = await invoiceService.getInvoices();
        if (invRes.data) {
          const ready = invRes.data.filter(inv => inv.currentStatus === 'ReadyForPayment');
          setReadyForPaymentCount(ready.length);
        }
      }
    } catch (err) {
      console.error('Error fetching live sidebar counts:', err);
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setUnreadNotifications(prev => prev.filter(n => n._id !== id));
      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ...(user?.role !== 'Employee' ? [
      { name: 'Vendors', href: '/vendors', icon: FileText },
      { name: 'Purchase Orders', href: '/purchase-orders', icon: FileSpreadsheet },
      { name: 'Invoices', href: '/invoices', icon: FileSpreadsheet },
      { name: 'Invoice Validation', href: '/validation', icon: RefreshCw },
      { name: 'Exceptions', href: '/exceptions', icon: AlertTriangle, badge: activeExceptionsCount > 0 ? activeExceptionsCount : null },
      { name: 'Payment Workbench', href: '/payment-workbench', icon: CreditCard, badge: readyForPaymentCount > 0 ? readyForPaymentCount : null }
    ] : []),
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
    { name: 'System Settings', href: '#settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-800 font-sans" id="main-layout">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
        ></div>
      )}

      {/* Sidebar container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg text-brand-400">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-bold text-white tracking-wide">AP Invoice AI</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
            id="close-sidebar-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href === '/' && location.pathname === '/');
            const isHash = item.href.startsWith('#');
            const LinkComponent = isHash ? 'a' : Link;
            const linkProps = isHash ? { href: item.href } : { to: item.href };

            return (
              <LinkComponent
                key={item.name}
                {...linkProps}
                className={`
                  group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-150
                  ${isActive 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full ${isActive ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </LinkComponent>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
            id="logout-btn"
          >
            <LogOut className="h-5 w-5 shrink-0 text-slate-500 hover:text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200">
          {/* Mobile menu trigger */}
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-900 mr-4"
              id="mobile-menu-btn"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden md:block ml-4">
              <SearchBar />
            </div>
          </div>

          {/* User profile dropdown and notifications */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <NotificationBell 
                unreadCount={unreadCount} 
                onClick={() => setNotificationOpen(!notificationOpen)} 
              />

              {notificationOpen && (
                <NotificationDropdown 
                  notifications={unreadNotifications}
                  onClose={() => setNotificationOpen(false)}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                />
              )}
            </div>

            {/* Divider */}
            <span className="h-6 w-px bg-slate-200"></span>

            {/* User Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2.5 p-1 rounded-full hover:bg-slate-50 transition-colors"
                id="user-menu-btn"
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm uppercase">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2.5 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-20 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-slate-105">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-slate-850 truncate">{user ? `${user.firstName} ${user.lastName}` : 'Guest User'}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-extrabold uppercase bg-brand-50 border border-brand-100 text-brand-650 rounded-full tracking-wide">
                        {user?.role}
                      </span>
                    </div>
                    <a href="#profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Your Profile</a>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left block px-4 py-2 text-sm text-rose-600 hover:bg-rose-50/50"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
