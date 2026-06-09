import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, User, Mail, Lock, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import authService from '../services/authService';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Employee' // Default role
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await authService.register(formData);
      setSuccessMsg('Account registered successfully! Redirecting to login...');
      setTimeout(() => {
        setIsLoading(false);
        navigate('/login');
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      // Capture express-validator array error details or custom schema constraints
      if (error.errors && error.errors.length > 0) {
        setErrorMsg(error.errors[0].msg);
      } else {
        setErrorMsg(error.message || 'Registration failed. Please check inputs.');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 font-sans" id="register-page">
      {/* Brand panel (Visible on Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-brand-950 via-brand-900 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-brand-500 rounded-full filter blur-[120px] opacity-25"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-[120px] opacity-20"></div>

        {/* Brand Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="p-2.5 bg-brand-600/20 border border-brand-500/30 rounded-xl text-brand-400">
            <FileText className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            AP Invoice
          </span>
        </div>

        {/* Brand Content */}
        <div className="z-10 max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight leading-none mb-6">
            Join the automated workspace.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Create an account to participate in automated invoice workflows, verify purchase matching rules, and access visual document extractions.
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

        <div className="w-full max-w-md space-y-6 animate-fade-in z-10">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <div className="p-3 bg-brand-600/20 border border-brand-500/30 rounded-2xl text-brand-400 mb-4">
              <FileText className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">AP Invoice Automation</h2>
            <p className="text-slate-400 text-sm mt-1">Create an account to get started</p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-3xl font-bold tracking-tight text-white">Create your account</h2>
            <p className="text-slate-400 mt-2 text-sm">Register a user and select an enterprise role</p>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-350 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-350 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="success-alert">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name Fields Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="first-name"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="last-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="last-name"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password-field" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  id="password-field"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            {/* Role Field */}
            <div>
              <label htmlFor="role-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Workspace Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <select
                  id="role-select"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="Employee" className="bg-slate-900 text-slate-100">Employee</option>
                  <option value="AccountsExecutive" className="bg-slate-900 text-slate-100">Accounts Executive</option>
                  <option value="Manager" className="bg-slate-900 text-slate-100">Manager</option>
                  <option value="Admin" className="bg-slate-900 text-slate-100">Admin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <ArrowRight className="h-4 w-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="register-btn"
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-brand-600 hover:bg-brand-500 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <span>Sign Up</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          {/* Redirect to login */}
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
