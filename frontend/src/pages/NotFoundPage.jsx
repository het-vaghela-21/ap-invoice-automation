import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans" id="notfound-page">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-850 via-slate-900 to-slate-950 opacity-90 pointer-events-none"></div>

      <div className="max-w-md w-full text-center space-y-6 animate-fade-in z-10">
        {/* Visual representation */}
        <div className="inline-flex p-5 bg-slate-800 border border-slate-700/60 rounded-3xl text-brand-400 mb-2">
          <FileQuestion className="h-16 w-16" id="notfound-icon" />
        </div>

        {/* Text descriptions */}
        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-brand-400 to-blue-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-2">
            Page Not Found
          </h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
            The page you are looking for doesn't exist or has been relocated in the AP Invoice Automation workspace.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98]"
            id="back-home-link"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
