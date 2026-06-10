import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ShieldAlert, Loader2, Eye, CheckCircle, Ban, AlertCircle, RefreshCw, X, Play, Info
} from 'lucide-react';
import paymentService from '../services/paymentService';
import { useAuth } from '../context/AuthContext';

const PaymentWorkbenchPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination & Filtering States
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // empty means 'All'

  // Mark Paid Modal States
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await paymentService.getPayments({
        page,
        limit,
        search: searchTerm.trim(),
        status: statusFilter
      });
      setPayments(res.data || []);
      setTotal(res.pagination?.total || 0);
      setPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Failed to retrieve payment records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
    // Fetch payments immediately after clearing search state
    setTimeout(() => {
      fetchPayments();
    }, 0);
  };

  const handleOpenPayModal = (payment) => {
    setSelectedInvoiceId(payment.invoiceId);
    setSelectedInvoiceNumber(payment.invoice?.extractedData?.invoiceNumber || 'N/A');
    setPaymentReference(`PAY-${Date.now()}`);
    setPaymentNotes('');
    setPayModalOpen(true);
  };

  const handleMarkPaidSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await paymentService.markPaid(selectedInvoiceId, {
        paymentReference,
        notes: paymentNotes
      });
      setSuccess(`Invoice '${selectedInvoiceNumber}' has been marked as PAID.`);
      setPayModalOpen(false);
      fetchPayments();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update payment status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHold = async (payment) => {
    const currentStatus = payment.paymentStatus;
    const hold = currentStatus !== 'OnHold'; // If currently not OnHold, we hold it. If OnHold, we release it.
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await paymentService.putOnHold(payment.invoiceId, {
        hold,
        notes: hold ? 'Payment placed on hold.' : 'Hold released, payment pending.'
      });
      setSuccess(`Payment for invoice '${payment.invoice?.extractedData?.invoiceNumber}' is now ${hold ? 'ON HOLD' : 'PENDING'}.`);
      fetchPayments();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to toggle hold status.');
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6" id="payment-workbench-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payment Workbench</h1>
          <p className="text-slate-500 text-sm mt-1">Manage disbursement schedules, release payment holds, and complete AP invoice settlements.</p>
        </div>
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
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters Area */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </div>
            <input
              type="text"
              placeholder="Search by invoice number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-600 text-white font-semibold text-xs rounded-xl hover:bg-brand-500 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {[
            { id: '', label: 'All Payments' },
            { id: 'Pending', label: 'Pending' },
            { id: 'OnHold', label: 'On Hold' },
            { id: 'Paid', label: 'Paid' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading payment workspace...</span>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-slate-50 border border-slate-105 rounded-2xl text-slate-405 mb-4">
            <Info className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Payments Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            No payments match your selection criteria. Validate invoices to add them to the workbench.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="payments-workbench-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Validation Date</th>
                  <th className="px-6 py-4">Payment Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {payments.map((item) => {
                  const invoiceNum = item.invoice?.extractedData?.invoiceNumber || 'N/A';
                  const vendorName = item.vendor?.vendorName || item.invoice?.extractedData?.vendorName || 'N/A';
                  const poNum = item.invoice?.extractedData?.poNumber || 'N/A';
                  const valDate = item.invoice?.reviewedAt || item.invoice?.updatedAt;
                  
                  return (
                    <tr key={item._id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{invoiceNum}</td>
                      <td className="px-6 py-4 font-semibold text-brand-650 truncate max-w-[160px]">{vendorName}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">{poNum}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(valDate)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          item.paymentStatus === 'Paid' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : item.paymentStatus === 'OnHold' 
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.paymentStatus === 'OnHold' ? 'On Hold' : item.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* View Invoice */}
                        <button
                          onClick={() => navigate(`/workspace/${item.invoiceId}`)}
                          className="inline-flex p-2 text-slate-400 hover:text-brand-650 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View Invoice Details"
                          id={`view-invoice-btn-${invoiceNum}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Put On Hold Toggle */}
                        {item.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleToggleHold(item)}
                            className={`inline-flex p-2 rounded-lg transition-colors ${
                              item.paymentStatus === 'OnHold' 
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                            title={item.paymentStatus === 'OnHold' ? 'Release Payment Hold' : 'Put Payment On Hold'}
                            id={`hold-invoice-btn-${invoiceNum}`}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}

                        {/* Mark Paid Action */}
                        {item.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleOpenPayModal(item)}
                            disabled={item.paymentStatus === 'OnHold'}
                            className="inline-flex p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-35"
                            title="Mark Invoice as Paid"
                            id={`pay-invoice-btn-${invoiceNum}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pages > 1 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{pages}</span> ({total} entries)
              </span>
              <div className="flex space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-3.5 py-1.5 border border-slate-250 bg-white rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page === pages}
                  onClick={() => setPage(prev => Math.min(prev + 1, pages))}
                  className="px-3.5 py-1.5 border border-slate-250 bg-white rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mark Paid Modal Dialog */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="pay-modal">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span>Process Settlement</span>
              </h3>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMarkPaidSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 space-y-1">
                <div>Invoice Reference Number: <span className="font-bold text-slate-800">{selectedInvoiceNumber}</span></div>
                <div>Status Transition: <span className="font-bold text-slate-800">ReadyForPayment &rarr; Paid</span></div>
              </div>

              {/* Payment Reference */}
              <div>
                <label htmlFor="paymentReference" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Payment Reference ID
                </label>
                <input
                  type="text"
                  id="paymentReference"
                  required
                  placeholder="e.g. TXN-100984"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="paymentNotes" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Internal Remarks / Notes
                </label>
                <textarea
                  id="paymentNotes"
                  rows={3}
                  placeholder="Input transaction confirmation details..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-805 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-5 py-2.5 text-slate-550 hover:bg-slate-550/5 border border-slate-250 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-650 hover:bg-emerald-555 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/15 active:scale-[0.98] disabled:opacity-85"
                  id="confirm-pay-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Settlement</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentWorkbenchPage;
