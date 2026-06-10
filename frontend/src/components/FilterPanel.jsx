import React, { useState } from 'react';
import { Filter, X, RotateCcw, Check } from 'lucide-react';

const FilterPanel = ({ 
  statuses = [], 
  vendors = [], 
  onApply, 
  onReset 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter Fields State
  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = (e) => {
    e.preventDefault();
    onApply({
      status,
      vendorId,
      poNumber: poNumber.trim(),
      minAmount: minAmount ? parseFloat(minAmount) : '',
      maxAmount: maxAmount ? parseFloat(maxAmount) : '',
      startDate,
      endDate
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setStatus('');
    setVendorId('');
    setPoNumber('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    onReset();
    setIsOpen(false);
  };

  const hasActiveFilters = 
    status || vendorId || poNumber || minAmount || maxAmount || startDate || endDate;

  return (
    <div className="relative inline-block text-left" id="advanced-filter-panel">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center space-x-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm ${
          hasActiveFilters 
            ? 'bg-brand-50 border-brand-305 text-brand-700 font-extrabold' 
            : 'bg-white border-slate-205 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Filter className="h-4 w-4" />
        <span>Advanced Filters</span>
        {hasActiveFilters && (
          <span className="ml-1 w-2 h-2 bg-brand-500 rounded-full"></span>
        )}
      </button>

      {/* Popover/Drawer Overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/15" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 z-50 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <Filter className="h-4 w-4 text-brand-605" />
                <span>Filter Criteria</span>
              </h4>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 text-xs font-semibold text-slate-550">
              {/* Status */}
              {statuses.length > 0 && (
                <div>
                  <label htmlFor="filterStatus" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Workflow Status
                  </label>
                  <select
                    id="filterStatus"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="">All Statuses</option>
                    {statuses.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vendor */}
              {vendors.length > 0 && (
                <div>
                  <label htmlFor="filterVendor" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Matched Vendor
                  </label>
                  <select
                    id="filterVendor"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="">All Vendors</option>
                    {vendors.map(v => (
                      <option key={v._id} value={v._id}>{v.vendorName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* PO Number */}
              <div>
                <label htmlFor="filterPO" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  PO Number
                </label>
                <input
                  type="text"
                  id="filterPO"
                  placeholder="e.g. PO-123456"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              {/* Amount Range */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Amount Range (USD)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="block w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Date Ingested Range
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-1.5 px-4.5 py-2 bg-brand-605 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-md shadow-brand-600/10 active:scale-[0.98]"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Apply Filter</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterPanel;
