import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, FileLock2 } from 'lucide-react';

/**
 * Route protection guard. Redirects unauthenticated sessions to /login.
 */
export const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading your profile...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    // Save the attempted URL redirect target location for redirect after successful login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Role-Based Access Control route wrapper.
 * Displays a premium access-denied UI if the user's role is not authorized.
 */
export const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wider text-slate-400">Authorizing role permissions...</span>
        </div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center max-w-xl mx-auto my-12 animate-fade-in" id="access-denied-view">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-500 mb-6">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-md">
          Your current role (<span className="font-bold text-slate-800">{user?.role || 'Guest'}</span>) does not have permission to view this workspace area. 
          Please contact system administrators if you require elevation.
        </p>
        <div className="mt-8 flex space-x-4">
          <a
            href="/"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};
