import React from 'react';
import { Bookmark, Clock, AlertTriangle, CreditCard, CheckCircle } from 'lucide-react';

const SavedViewSelector = ({ activeView = '', onViewSelect }) => {
  const views = [
    { id: 'pending-review', label: 'Pending Review', status: 'UnderReview', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'exceptions', label: 'Exceptions', status: 'Exception', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'ready-payment', label: 'Ready For Payment', status: 'ReadyForPayment', icon: CreditCard, color: 'text-purple-650 bg-purple-50 border-purple-200' },
    { id: 'paid', label: 'Paid', status: 'Paid', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
  ];

  return (
    <div className="space-y-2.5" id="saved-views-selector">
      <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Bookmark className="h-4 w-4 text-brand-650" />
        <span>Saved Views</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {views.map(v => {
          const isActive = activeView === v.id;
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewSelect(v.id, v.status)}
              className={`flex items-center space-x-3 p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                isActive 
                  ? `${v.color} font-extrabold shadow-sm` 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs">{v.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SavedViewSelector;
