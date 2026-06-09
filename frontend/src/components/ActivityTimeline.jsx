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

      <div className="space-y-6">
        {logs.map((log, index) => {
          const timeString = new Date(log.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const dateString = new Date(log.timestamp).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          });

          const userDisplay = log.performedBy 
            ? `${log.performedBy.firstName} ${log.performedBy.lastName}` 
            : 'System';

          const hasTransition = log.previousState && log.newState && log.previousState !== log.newState;
          const statusText = hasTransition 
            ? `${log.previousState} → ${log.newState}`
            : (log.newState || log.previousState || '');

          return (
            <div key={log._id || index} className="space-y-1.5 animate-fade-in" id={`timeline-event-${log._id || index}`}>
              {/* Time */}
              <div className="text-xs font-bold text-slate-400 flex items-center space-x-1">
                <span>{timeString}</span>
                <span className="font-medium text-slate-300">({dateString})</span>
              </div>

              {/* Action */}
              <div className="text-sm font-extrabold text-slate-800 tracking-tight">
                {log.action}
              </div>

              {/* User */}
              <div className="text-xs text-slate-500 font-semibold flex items-center space-x-1">
                <span>By:</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.performedBy ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-150'}`}>
                  {userDisplay}
                </span>
              </div>

              {/* Status Transition */}
              {statusText && (
                <div className="text-xs font-extrabold mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] uppercase font-extrabold border ${
                    log.newState === 'ReadyForPayment' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                      : log.newState === 'Exception'
                      ? 'bg-rose-50 text-rose-700 border-rose-250'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {statusText}
                  </span>
                </div>
              )}

              {/* Notes */}
              {log.notes && (
                <div className="text-xs text-slate-600 font-medium bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl max-w-xl">
                  {log.notes}
                </div>
              )}

              {/* Dotted Separator */}
              {index < logs.length - 1 && (
                <div className="pt-4 border-b border-dashed border-slate-200/80 max-w-xl"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;
