import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import exceptionService from '../services/exceptionService';
import authService from '../services/authService';
import { apiClient } from '../services/authService';
import {
  ArrowLeft, ZoomIn, ZoomOut, RotateCcw,
  AlertCircle, CheckCircle, Loader2, Save, FileText,
  User, Calendar, Info, Clock, AlertTriangle, ShieldAlert, CheckSquare, Send
} from 'lucide-react';

const ExceptionDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  // State variables
  const [exception, setException] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [assignedUserId, setAssignedUserId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [zoom, setZoom] = useState(1.0);
  const [mockPdfText, setMockPdfText] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await exceptionService.getExceptionById(id);
      if (res?.status === 'success' && res.data) {
        const excData = res.data;
        setException(excData);
        setInvoice(excData.invoiceId);
        setAssignedUserId(excData.assignedTo?._id || excData.assignedTo || '');
        setResolutionNotes(excData.resolutionNotes || '');

        // Fetch audit logs for the related invoice
        if (excData.invoiceId?._id) {
          const auditRes = await apiClient.get(`/audit/invoice/${excData.invoiceId._id}`);
          setAuditLogs(auditRes.data?.data || []);
        }

        // Verify simulated PDF
        if (excData.invoiceId?.invoiceFileUrl) {
          verifySimulatedPdf(excData.invoiceId.invoiceFileUrl);
        }
      } else {
        setError('Failed to retrieve exception details.');
      }

      // Fetch users if admin/manager
      if (isAdminOrManager) {
        setIsUsersLoading(true);
        const uRes = await authService.getUsers();
        setUsers(uRes.data || []);
        setIsUsersLoading(false);
      }
    } catch (err) {
      console.error('Fetch exception details failed:', err);
      setError(err.message || 'Error loading exception details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySimulatedPdf = (url) => {
    const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('raw');
    if (isPdf) {
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch PDF');
          return res.text();
        })
        .then(text => {
          if (text.length < 2000 && !text.includes('/Catalog') && !text.includes('stream')) {
            setMockPdfText(text);
          }
        })
        .catch(err => {
          console.error('Error verifying PDF file contents:', err);
        });
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.5));
  const handleZoomReset = () => setZoom(1.0);

  const handleAssign = async () => {
    if (isActioning) return;
    setIsActioning(true);
    setError('');
    setSuccess('');
    try {
      const res = await exceptionService.assignException(id, assignedUserId || null);
      setSuccess(res.message || 'Exception assignee updated successfully.');
      await fetchDetails();
    } catch (err) {
      setError(err.message || 'Failed to update exception assignee.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleResolve = async () => {
    if (isActioning) return;
    if (!resolutionNotes.trim()) {
      setError('Please provide resolution notes before marking the exception as Resolved.');
      return;
    }
    setIsActioning(true);
    setError('');
    setSuccess('');
    try {
      const res = await exceptionService.resolveException(id, resolutionNotes);
      setSuccess(res.message || 'Exception resolved successfully.');
      await fetchDetails();
    } catch (err) {
      setError(err.message || 'Failed to resolve exception.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleClose = async () => {
    if (isActioning) return;
    if (exception.status !== 'Resolved' && !resolutionNotes.trim()) {
      setError('Please provide notes before closing this exception.');
      return;
    }
    if (!window.confirm('Are you sure you want to close this exception? If all exceptions for this invoice are closed, it will trigger validation rechecks.')) {
      return;
    }
    setIsActioning(true);
    setError('');
    setSuccess('');
    try {
      const res = await exceptionService.closeException(id, resolutionNotes);
      setSuccess(res.message || 'Exception closed successfully.');
      
      // Navigate back to queue with success message
      navigate('/exceptions', {
        state: {
          successMessage: 'Exception closed successfully. Invoice validation state re-evaluated.'
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to close exception.');
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[400px]">
        <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading Exception Workspace...</span>
      </div>
    );
  }

  const isPdf = invoice?.invoiceFileUrl?.toLowerCase().endsWith('.pdf') || invoice?.invoiceFileUrl?.includes('raw');

  // Badge styles
  const severityBadge = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    High: 'bg-orange-50 text-orange-800 border-orange-200',
    Critical: 'bg-rose-50 text-rose-800 border-rose-250 font-extrabold'
  };

  const statusBadge = {
    Open: 'bg-rose-100 text-rose-850 border-rose-200',
    InProgress: 'bg-amber-100 text-amber-850 border-amber-200',
    Resolved: 'bg-indigo-100 text-indigo-850 border-indigo-200',
    Closed: 'bg-emerald-100 text-emerald-850 border-emerald-200'
  };

  // Helper for audit logs icons
  const getAuditIcon = (action) => {
    switch (action) {
      case 'Invoice Uploaded':
      case 'Invoice Upload':
        return <FileText className="h-4 w-4 text-slate-500" />;
      case 'OCR Extraction Completed':
      case 'OCR text extraction completed':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'Exception Assigned':
        return <User className="h-4 w-4 text-amber-500" />;
      case 'Exception Resolved':
        return <CheckCircle className="h-4 w-4 text-indigo-500" />;
      case 'Exception Closed':
        return <CheckSquare className="h-4 w-4 text-emerald-500" />;
      case 'Invoice Validated':
        return <CheckCircle className="h-4 w-4 text-emerald-600 font-bold" />;
      case 'Invoice Finalized':
        return <CheckSquare className="h-4 w-4 text-emerald-650 font-bold" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6" id="exception-details-page">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            to="/exceptions"
            className="inline-flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Return to list"
            id="workspace-back-link"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exception Details</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${severityBadge[exception?.severity]}`}>
                {exception?.severity} Severity
              </span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${statusBadge[exception?.status]}`}>
                {exception?.status === 'InProgress' ? 'In Progress' : exception?.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
              {exception?.exceptionType}
            </h1>
          </div>
        </div>

        {invoice && (
          <Link
            to={`/validation/${invoice._id}`}
            className="inline-flex items-center space-x-1.5 px-4.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
            id="go-to-validation-workspace-btn"
          >
            <span>Open Validation Workspace</span>
            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-250 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="workspace-error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-850 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="workspace-success-alert">
          <CheckSquare className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-20">
        
        {/* LEFT PANEL: PDF Preview */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[750px]">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-center space-x-1.5">
              <FileText className="h-4.5 w-4.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Document Preview</span>
            </div>
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-50 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-600 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-50 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="h-4 w-px bg-slate-200 my-0.5"></span>
              <button
                type="button"
                onClick={handleZoomReset}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-50 transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-100 overflow-auto relative p-4 flex items-start justify-center">
            {invoice?.invoiceFileUrl ? (
              <div 
                style={{ 
                  transform: `scale(${zoom})`, 
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                  width: isPdf ? '100%' : 'auto',
                  height: isPdf ? '670px' : 'auto'
                }}
                className="origin-top shadow-md bg-white rounded-lg overflow-hidden w-full h-full"
              >
                {mockPdfText ? (
                  <div className="p-8 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 h-full min-h-[670px] overflow-auto select-all whitespace-pre-wrap text-left">
                    <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between font-sans">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Simulated PDF Preview</span>
                      <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold">Auto Fallback Preview</span>
                    </div>
                    {mockPdfText}
                  </div>
                ) : isPdf ? (
                  <iframe 
                    src={`${invoice.invoiceFileUrl}#toolbar=0`} 
                    className="w-full h-full border-0 min-h-[670px]" 
                    title="Invoice Document"
                  />
                ) : (
                  <img 
                    src={invoice.invoiceFileUrl} 
                    alt="Invoice Preview" 
                    className="max-w-full max-h-[670px] object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="h-10 w-10 mb-2" />
                <span>No document preview available</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Details, Assignments, Resolution and Timeline */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-brand-600" />
              Issue & Invoice Reference
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Description</span>
                <span className="text-slate-800 font-semibold mt-1 block">{exception?.description}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Original Filename</span>
                <span className="text-slate-850 mt-1 block max-w-xs truncate">{invoice?.originalFileName}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Invoice Number</span>
                {invoice?._id ? (
                  <Link 
                    to={`/workspace/${invoice._id}`}
                    className="text-brand-650 hover:text-brand-500 font-bold mt-1 block hover:underline"
                    id="exception-detail-invoice-link"
                  >
                    {invoice?.extractedData?.invoiceNumber || 'N/A'}
                  </Link>
                ) : (
                  <span className="text-slate-800 font-bold mt-1 block">{invoice?.extractedData?.invoiceNumber || 'N/A'}</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Extracted Vendor Name</span>
                <span className="text-slate-700 font-semibold mt-1 block">{invoice?.extractedData?.vendorName || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Matched PO Reference</span>
                <span className="text-slate-700 font-semibold mt-1 block">
                  {invoice?.matchedPO?.poNumber || invoice?.extractedData?.poNumber || 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Total Amount</span>
                <span className="text-slate-850 font-bold mt-1 block">
                  {invoice?.extractedData?.totalAmount ? `$${parseFloat(invoice.extractedData.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Controls */}
          {isAdminOrManager && exception?.status !== 'Closed' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-1 flex items-center gap-1.5">
                <User className="h-4 w-4 text-brand-600" />
                Assign Exception
              </h2>
              <p className="text-xs text-slate-400">Assign this exception to an executive to work on resolution.</p>
              <div className="flex gap-3 items-center">
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700 font-semibold"
                  disabled={isUsersLoading}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={isActioning}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Update Assignee
                </button>
              </div>
            </div>
          )}

          {/* Resolution Forms */}
          {exception?.status !== 'Closed' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-brand-600" />
                Resolution Panel
              </h2>
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Resolution Notes <span className="text-rose-500">*</span></label>
                <textarea
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="Explain how this issue was validated, matched, or corrected..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700"
                />
              </div>

              <div className="flex gap-3">
                {exception.status !== 'Resolved' && (
                  <button
                    onClick={handleResolve}
                    disabled={isActioning}
                    className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={handleClose}
                  disabled={isActioning}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    exception.status === 'Resolved'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Close Exception
                </button>
              </div>
            </div>
          )}

          {/* Audit Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-brand-600" />
              Invoice Audit History
            </h2>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No logs found for this invoice.</p>
            ) : (
              <div className="relative border-l border-slate-100 pl-4 space-y-5 py-2">
                {auditLogs.map((log) => {
                  const logDate = new Date(log.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });
                  const performer = log.performedBy
                    ? `${log.performedBy.firstName} ${log.performedBy.lastName} (${log.performedBy.role})`
                    : 'System';

                  return (
                    <div key={log._id} className="relative text-xs">
                      {/* Timeline icon */}
                      <span className="absolute -left-[24px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
                        {getAuditIcon(log.action)}
                      </span>
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wide">{log.action}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{logDate}</span>
                      </div>
                      <p className="text-slate-500 mt-1">{log.notes}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Performed by: {performer}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExceptionDetailsPage;
