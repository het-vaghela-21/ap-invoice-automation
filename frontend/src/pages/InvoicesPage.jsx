import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import invoiceService from '../services/invoiceService';
import { 
  FileText, Plus, Search, Trash2, 
  AlertCircle, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react';

const InvoicesPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Deletion modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setInvoices(response.data || []);
      setFilteredInvoices(response.data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message || 'Failed to retrieve invoice records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter lists locally
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(inv => 
        (inv.originalFileName && inv.originalFileName.toLowerCase().includes(term)) ||
        (inv.extractionStatus && inv.extractionStatus.toLowerCase().includes(term)) ||
        (inv.matchingStatus && inv.matchingStatus.toLowerCase().includes(term)) ||
        (inv.uploadedBy?.firstName && inv.uploadedBy.firstName.toLowerCase().includes(term)) ||
        (inv.uploadedBy?.lastName && inv.uploadedBy.lastName.toLowerCase().includes(term))
      );
      setFilteredInvoices(filtered);
    }
  }, [searchTerm, invoices]);

  const handleDeleteClick = (invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    setError('');
    setSuccess('');
    try {
      await invoiceService.deleteInvoice(invoiceToDelete._id);
      setSuccess(`Invoice ${invoiceToDelete.originalFileName} has been successfully deleted.`);
      setDeleteModalOpen(false);
      setInvoiceToDelete(null);
      fetchInvoices(); // Reload entries
    } catch (err) {
      console.error('Delete invoice error:', err);
      setError(err.message || 'Failed to delete the invoice document.');
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const canUpload = ['Admin', 'Manager', 'AccountsExecutive'].includes(user?.role);
  const canDelete = user?.role === 'Admin';

  const extractionColors = {
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-250',
    Processing: 'bg-indigo-50 text-indigo-750 border-indigo-200',
    Completed: 'bg-emerald-50 text-emerald-750 border-emerald-250',
    Failed: 'bg-rose-50 text-rose-750 border-rose-250'
  };

  const matchingColors = {
    NotMatched: 'bg-slate-50 text-slate-600 border-slate-200',
    Matched: 'bg-emerald-50 text-emerald-700 border-emerald-250',
    Mismatch: 'bg-orange-50 text-orange-700 border-orange-250'
  };

  const validationColors = {
    Pending: 'bg-yellow-50 text-yellow-750 border-yellow-250',
    MissingRequiredFields: 'bg-rose-50 text-rose-750 border-rose-250',
    ReadyForReview: 'bg-blue-50 text-blue-750 border-blue-200',
    Reviewed: 'bg-emerald-50 text-emerald-750 border-emerald-250',
    POMatched: 'bg-purple-50 text-purple-750 border-purple-250',
    ReadyForPayment: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6" id="invoices-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Ingest, view, and organize Accounts Payable vendor invoices.</p>
        </div>
        {canUpload && (
          <Link
            to="/invoices/upload"
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98]"
            id="upload-invoice-btn"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Upload Invoice</span>
          </Link>
        )}
      </div>

      {/* Action Alerts */}
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

      {/* Filters area */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search by file name, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
          />
        </div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl text-center">
          Access Role: <span className="text-brand-650 font-bold">{user?.role}</span>
        </div>
      </div>

      {/* Main Listing View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading ingested invoices...</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
            <FileText className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Invoices Uploaded</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm ? 'No entries match your search criteria. Try modifying your search keywords.' : 'Import purchase order invoice documents to organize transactions.'}
          </p>
          {canUpload && !searchTerm && (
            <Link
              to="/invoices/upload"
              className="mt-6 inline-flex items-center space-x-1.5 text-xs font-bold text-brand-650 hover:text-brand-500"
            >
              <span>Upload your first invoice</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="invoices-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  <th className="px-6 py-4">Original File Name</th>
                  <th className="px-6 py-4">Upload Date</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Extraction Status</th>
                  <th className="px-6 py-4">Validation Status</th>
                  <th className="px-6 py-4">Review Status</th>
                  <th className="px-6 py-4">Matching Status</th>
                  <th className="px-6 py-4">Uploaded By</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredInvoices.map((inv) => {
                  const uploadDate = new Date(inv.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  });
                  const uploadedByName = inv.uploadedBy ? `${inv.uploadedBy.firstName} ${inv.uploadedBy.lastName}` : '-';
                  const vendorDisplay = inv.matchedVendor ? inv.matchedVendor.vendorName : (inv.extractedData?.vendorName || '-');
                  return (
                    <tr key={inv._id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800 max-w-[200px] truncate">
                        <Link 
                          to={`/invoices/${inv._id}`}
                          className="text-brand-650 hover:text-brand-500 font-semibold transition-colors"
                          id={`invoice-name-link-${inv.originalFileName}`}
                        >
                          {inv.originalFileName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{uploadDate}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{vendorDisplay}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${extractionColors[inv.extractionStatus] || 'bg-slate-100'}`}>
                          {inv.extractionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${validationColors[inv.validationStatus] || 'bg-slate-105'}`}>
                          {inv.validationStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          inv.reviewStatus === 'ReadyForPayment'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.reviewStatus === 'Reviewed'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : inv.reviewStatus === 'Awaiting Review'
                            ? 'bg-yellow-50 text-yellow-750 border-yellow-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {inv.reviewStatus === 'ReadyForPayment' 
                            ? 'Ready For Payment' 
                            : inv.reviewStatus === 'Awaiting Review' 
                            ? 'Awaiting Review'
                            : inv.reviewStatus === 'Awaiting Extraction'
                            ? 'Awaiting Extraction'
                            : inv.reviewStatus || 'Pending Review'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${matchingColors[inv.matchingStatus] || 'bg-slate-100'}`}>
                          {inv.matchingStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{uploadedByName}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-250 shadow-sm"
                          title="View Details"
                          id={`view-invoice-details-${inv.originalFileName}`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(inv)}
                            className="inline-flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Invoice"
                            id={`delete-invoice-btn-${inv.originalFileName}`}
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        )}
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

      {/* Confirmation Modal for Purges */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="confirm-delete-modal">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Delete Invoice Document</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Are you sure you want to permanently delete Invoice <span className="font-semibold text-slate-800">{invoiceToDelete?.originalFileName}</span>? 
              This action deletes both the database profile and purges the file attachment from storage. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => { setDeleteModalOpen(false); setInvoiceToDelete(null); }}
                className="px-4.5 py-2.5 text-slate-500 hover:bg-slate-50 border border-slate-250 rounded-xl text-sm font-semibold transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                disabled={isDeleting}
                id="modal-delete-btn"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
