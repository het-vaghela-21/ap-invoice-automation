import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, FileText, FileSpreadsheet, Building, X } from 'lucide-react';
import { apiClient } from '../services/authService';

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Debounced search queries
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(response.data.data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleResultClick = (link) => {
    setQuery('');
    setIsOpen(false);
    navigate(link);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Invoice':
        return <FileText className="h-4 w-4 text-indigo-500" />;
      case 'PO':
        return <FileSpreadsheet className="h-4 w-4 text-blue-500" />;
      case 'Vendor':
        return <Building className="h-4 w-4 text-emerald-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      Uploaded: 'bg-indigo-50 text-indigo-700 border-indigo-150',
      Extracted: 'bg-sky-50 text-sky-705 border-sky-150',
      UnderReview: 'bg-amber-55/10 text-amber-705 border-amber-200',
      Validated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ReadyForPayment: 'bg-purple-50 text-purple-700 border-purple-200',
      Exception: 'bg-rose-50 text-rose-700 border-rose-200',
      Paid: 'bg-emerald-50 text-emerald-705 border-emerald-250',
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-150',
      Inactive: 'bg-slate-50 text-slate-500 border-slate-205',
      Open: 'bg-blue-50 text-blue-700 border-blue-150',
      Closed: 'bg-emerald-50 text-emerald-700 border-emerald-150',
      Draft: 'bg-slate-50 text-slate-500 border-slate-150',
      Cancelled: 'bg-rose-50 text-rose-700 border-rose-150'
    };

    const colorClass = colors[status] || 'bg-slate-50 text-slate-600 border-slate-150';
    return (
      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="relative w-full max-w-sm sm:max-w-md" ref={dropdownRef} id="global-search-container">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Global Search (Invoice #, PO, Vendor, GST)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          className="block w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-805 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-xs font-semibold"
        />
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-brand-650 animate-spin" />
          ) : query ? (
            <button 
              onClick={() => { setQuery(''); setResults([]); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2.5 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 max-h-[360px] overflow-y-auto animate-fade-in">
          {results.length === 0 ? (
            <div className="px-4.5 py-4.5 text-center text-slate-400 text-xs">
              No matching records found.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Matches ({results.length})
              </div>
              {results.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  onClick={() => handleResultClick(item.link)}
                  className="group flex items-center justify-between px-4.5 py-3.5 hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="p-1.5 bg-slate-100 group-hover:bg-white rounded-lg border border-slate-200 transition-colors">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="text-xs font-bold text-slate-750 group-hover:text-brand-650 truncate max-w-[200px]" title={item.identifier}>
                      {item.identifier}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-right">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                      {item.type}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
