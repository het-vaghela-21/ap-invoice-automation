import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FileText, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const result = await authService.login({ email, password });
      login(result.token, result.user);

      // Determine redirection target (e.g. page attempted before intercept redirect)
      const fromPath = location.state?.from?.pathname || '/';
      navigate(fromPath, { replace: true });
    } catch (error) {
      setIsLoading(false);
      if (error.errors && error.errors.length > 0) {
        setErrorMsg(error.errors[0].msg);
      } else {
        setErrorMsg(error.message || 'Invalid email or password');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 font-sans" id="login-page">
      {/* Brand panel (Visible on Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-brand-950 via-brand-900 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-brand-500 rounded-full filter blur-[120px] opacity-25"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-[120px] opacity-20"></div>

        {/* Brand Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="p-2.5 bg-brand-600/20 border border-brand-500/30 rounded-xl text-brand-400">
            <FileText className="h-6 w-6" id="brand-icon-logo" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            AP Invoice
          </span>
        </div>

        {/* Brand Content */}
        <div className="z-10 max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight leading-none mb-6">
            Intelligent Invoice Processing, Simplified.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Automate accounts payable pipelines. Extract critical fields with deep learning, auto-verify purchase orders, and accelerate approval lifecycles.
          </p>
        </div>

        {/* Footer */}
        <div className="text-slate-400 text-sm z-10">
          &copy; 2026 AP Invoice Automation System. All rights reserved.
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 opacity-80 pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 animate-fade-in z-10">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="p-3 bg-brand-600/20 border border-brand-500/30 rounded-2xl text-brand-400 mb-4">
              <FileText className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">AP Invoice Automation</h2>
            <p className="text-slate-400 text-sm mt-1">Please sign in to access your dashboard</p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="text-slate-400 mt-2 text-sm">Enter your credentials to manage invoices</p>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-350 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password-field" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <a href="#forgot" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password-field"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-900 text-brand-600 focus:ring-brand-500/50"
              />
              <label htmlFor="remember-me" className="ml-2.5 text-sm text-slate-400">
                Keep me signed in
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="login-btn"
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-brand-600 hover:bg-brand-500 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          {/* Redirect to registration */}
          <p className="text-center text-sm text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
