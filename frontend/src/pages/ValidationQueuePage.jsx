import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import invoiceService from '../services/invoiceService';
import { 
  FileText, Search, Loader2, ArrowRight,
  AlertCircle, CheckCircle2, Clock, CheckSquare, XCircle
} from 'lucide-react';

const ValidationQueuePage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'accepted', 'rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check for success message redirected from other views
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await invoiceService.getInvoices();
      const allInvoices = response.data || [];
      
      // Filter invoices in the validation flow
      const validationList = allInvoices.filter(inv => 
        inv.reviewStatus === 'Awaiting Review' || 
        inv.reviewStatus === 'Reviewed' ||
        inv.reviewStatus === 'PendingReview' ||
        inv.reviewStatus === 'ReadyForPayment' ||
        inv.validationStatus === 'Rejected' ||
        inv.invoiceDecision === 'Rejected' ||
        inv.invoiceDecision === 'Accepted'
      );
      
      setInvoices(validationList);
    } catch (err) {
      console.error('Error fetching validation queue:', err);
      setError(err.message || 'Failed to retrieve validation records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter and tab segmentation
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    let segmented = invoices.filter(inv => {
      if (activeTab === 'pending') {
        return (
          (inv.reviewStatus === 'Awaiting Review' || inv.reviewStatus === 'PendingReview') &&
          inv.invoiceDecision !== 'Rejected' &&
          inv.invoiceDecision !== 'Accepted'
        );
      } else if (activeTab === 'accepted') {
        return inv.reviewStatus === 'ReadyForPayment' || inv.invoiceDecision === 'Accepted';
      } else {
        return inv.validationStatus === 'Rejected' || inv.invoiceDecision === 'Rejected';
      }
    });

    if (term) {
      segmented = segmented.filter(inv => 
        (inv.originalFileName && inv.originalFileName.toLowerCase().includes(term)) ||
        (inv.extractedData?.vendorName && inv.extractedData.vendorName.toLowerCase().includes(term)) ||
        (inv.matchedVendor?.vendorName && inv.matchedVendor.vendorName.toLowerCase().includes(term)) ||
        (inv.extractedData?.invoiceNumber && inv.extractedData.invoiceNumber.toLowerCase().includes(term))
      );
    }

    setFilteredInvoices(segmented);
  }, [searchTerm, invoices, activeTab]);

  const validationColors = {
    Pending: 'bg-yellow-50 text-yellow-750 border-yellow-200',
    MissingRequiredFields: 'bg-rose-50 text-rose-750 border-rose-250',
    ReadyForReview: 'bg-blue-55 bg-blue-50 text-blue-750 border-blue-200',
    Reviewed: 'bg-indigo-50 text-indigo-750 border-indigo-200',
    POMatched: 'bg-purple-50 text-purple-750 border-purple-200',
    ReadyForPayment: 'bg-emerald-50 text-emerald-750 border-emerald-250',
    Rejected: 'bg-rose-50 text-rose-750 border-rose-250'
  };

  const matchingColors = {
    NotMatched: 'bg-slate-50 text-slate-600 border-slate-200',
    Matched: 'bg-emerald-50 text-emerald-700 border-emerald-250',
    Mismatch: 'bg-orange-50 text-orange-700 border-orange-250'
  };

  const decisionColors = {
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-250',
    Accepted: 'bg-emerald-50 text-emerald-750 border-emerald-250',
    Rejected: 'bg-rose-50 text-rose-750 border-rose-250'
  };

  return (
    <div className="space-y-6" id="validation-queue-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoice Validation Queue</h1>
          <p className="text-slate-500 text-sm mt-1">Review OCR fields, score vendor similarity, match PO line items, and finalize transactions.</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="success-alert">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs & Search controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="queue-tab-pending"
          >
            <Clock className="h-4 w-4" />
            <span>Awaiting Validation</span>
            <span className={`ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full ${
              activeTab === 'pending' ? 'bg-brand-50 text-brand-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {invoices.filter(i => (i.reviewStatus === 'Awaiting Review' || i.reviewStatus === 'PendingReview') && i.invoiceDecision !== 'Rejected' && i.invoiceDecision !== 'Accepted').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'accepted'
                ? 'bg-white text-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="queue-tab-accepted"
          >
            <CheckSquare className="h-4 w-4" />
            <span>Finalized & Accepted</span>
            <span className={`ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full ${
              activeTab === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {invoices.filter(i => i.reviewStatus === 'ReadyForPayment' || i.invoiceDecision === 'Accepted').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'rejected'
                ? 'bg-white text-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="queue-tab-rejected"
          >
            <XCircle className="h-4 w-4" />
            <span>Rejected</span>
            <span className={`ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full ${
              activeTab === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {invoices.filter(i => i.validationStatus === 'Rejected' || i.invoiceDecision === 'Rejected').length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search by file name or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading validation queue...</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
            <FileText className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Invoices in Queue</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm ? 'No entries match your search criteria.' : `There are no invoices in this category currently.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="validation-queue-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  <th className="px-6 py-4">Original File Name</th>
                  <th className="px-6 py-4">Ingest Date</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Match Score</th>
                  <th className="px-6 py-4">Validation Status</th>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredInvoices.map((inv) => {
                  const uploadDate = new Date(inv.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  });
                  const vendorDisplay = inv.matchedVendor ? inv.matchedVendor.vendorName : (inv.extractedData?.vendorName || '-');
                  const isPending = activeTab === 'pending';
                  const matchScore = inv.vendorSimilarityScore !== undefined ? `${inv.vendorSimilarityScore}%` : '-';
                  
                  return (
                    <tr key={inv._id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800 max-w-[200px] truncate">
                        <Link 
                          to={`/invoices/${inv._id}`}
                          className="text-brand-650 hover:text-brand-500 transition-colors font-semibold"
                        >
                          {inv.originalFileName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{uploadDate}</td>
                      <td className="px-6 py-4 font-semibold text-slate-705 text-slate-700">{vendorDisplay}</td>
                      <td className="px-6 py-4 text-slate-600 font-semibold">{inv.extractedData?.invoiceNumber || '-'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-850">
                        {inv.extractedData?.totalAmount ? `$${parseFloat(inv.extractedData.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${inv.vendorSimilarityScore >= 80 ? 'text-emerald-600' : inv.vendorSimilarityScore >= 50 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {matchScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${validationColors[inv.validationStatus] || 'bg-slate-100'}`}>
                          {inv.validationStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${decisionColors[inv.invoiceDecision] || 'bg-slate-100'}`}>
                          {inv.invoiceDecision || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/validation/${inv._id}`}
                          className={`inline-flex items-center space-x-1.5 px-4.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                            isPending
                              ? 'bg-brand-600 hover:bg-brand-500 text-white border-brand-600 hover:border-brand-500 shadow-md shadow-brand-600/10'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-250'
                          }`}
                          id={`validate-action-${inv._id}`}
                        >
                          <span>{isPending ? 'Review & Validate' : 'View Workspace'}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
            <span>Showing {filteredInvoices.length} entries</span>
            <span>AP Invoice Automation System</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationQueuePage;
