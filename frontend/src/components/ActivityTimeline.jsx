import React, { useEffect, useState } from 'react';
import { 
  Upload, Cpu, User, Link as LinkIcon, ShieldCheck, 
  Lock, Activity, Clock, AlertTriangle, Loader2 
} from 'lucide-react';
import { apiClient } from '../services/authService';

const ActivityTimeline = ({ invoiceId }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTimeline = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/audit/invoice/${invoiceId}`);
      if (response?.data?.status === 'success') {
        setLogs(response.data.data || []);
      } else {
        setError('Failed to fetch activity history.');
      }
    } catch (err) {
      console.error('Error fetching activity history:', err);
      setError(err.response?.data?.message || 'Error loading activity timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchTimeline();
    }
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[150px]">
        <Loader2 className="h-6 w-6 text-brand-600 animate-spin mr-2" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loading activity log...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50/50 border border-rose-100 text-rose-800 p-4 rounded-xl flex items-start space-x-2.5 text-xs">
        <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">No Activity History</h4>
        <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
          No audit logs or workflow events recorded for this invoice yet.
        </p>
      </div>
    );
  }

  const getActionStyles = (action) => {
    switch (action) {
      case 'Invoice Upload':
        return {
          icon: Upload,
          bgColor: 'bg-blue-50 border-blue-200 text-blue-600',
          textColor: 'text-blue-700'
        };
      case 'OCR Extraction':
        return {
          icon: Cpu,
          bgColor: 'bg-indigo-50 border-indigo-200 text-indigo-600',
          textColor: 'text-indigo-700'
        };
      case 'Vendor Match':
        return {
          icon: User,
          bgColor: 'bg-emerald-50 border-emerald-255 text-emerald-600',
          textColor: 'text-emerald-700'
        };
      case 'PO Match':
        return {
          icon: LinkIcon,
          bgColor: 'bg-amber-50 border-amber-250 text-amber-600',
          textColor: 'text-amber-700'
        };
      case 'Validation':
        return {
          icon: ShieldCheck,
          bgColor: 'bg-violet-50 border-violet-200 text-violet-600',
          textColor: 'text-violet-700'
        };
      case 'Finalization':
        return {
          icon: Lock,
          bgColor: 'bg-emerald-600 border-emerald-700 text-white',
          textColor: 'text-emerald-800'
        };
      case 'Status Change':
      default:
        return {
          icon: Activity,
          bgColor: 'bg-slate-100 border-slate-250 text-slate-600',
          textColor: 'text-slate-700'
        };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Uploaded':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Extracted':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'UnderReview':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Validated':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ReadyForPayment':
        return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'Exception':
        return 'bg-rose-50 text-rose-700 border-rose-250';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="activity-timeline-container">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center">
          <Clock className="h-4.5 w-4.5 text-slate-400 mr-2" />
          <span>Activity & Audit Trail</span>
        </h2>
        <span className="text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
          {logs.length} Event{logs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative pl-6 border-l border-slate-200 space-y-6 ml-2.5 pt-1.5 pb-1.5">
        {logs.map((log, index) => {
          const styles = getActionStyles(log.action);
          const IconComponent = styles.icon;
          
          const formattedTime = new Date(log.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });

          return (
            <div key={log._id || index} className="relative group animate-fade-in" id={`timeline-event-${log._id || index}`}>
              {/* Dot Icon badge */}
              <div className={`absolute -left-[35px] top-0.5 w-7.5 h-7.5 w-7 h-7 rounded-full border flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-105 ${styles.bgColor}`}>
                <IconComponent className="h-3.5 w-3.5" />
              </div>

              {/* Event Body */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-850">{log.action}</span>
                    
                    {log.previousState !== log.newState && log.newState && (
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase border ${getStatusColor(log.newState)}`}>
                        {log.newState}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{formattedTime}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl">
                  {log.notes}
                </p>

                {/* Performed By Info */}
                <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-1">
                  <span className="font-bold">Performed By:</span>
                  {log.performedBy ? (
                    <span className="inline-flex items-center bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 font-bold">
                      {log.performedBy.firstName} {log.performedBy.lastName} ({log.performedBy.role})
                    </span>
                  ) : (
                    <span className="inline-flex items-center bg-indigo-50 text-indigo-700 border border-indigo-150 rounded px-1.5 py-0.5 font-extrabold tracking-wide uppercase text-[8px]">
                      System
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;
