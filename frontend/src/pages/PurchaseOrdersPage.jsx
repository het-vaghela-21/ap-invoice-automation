import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import purchaseOrderService from '../services/purchaseOrderService';
import { 
  FileSpreadsheet, Plus, Edit2, Ban, Search, 
  AlertCircle, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react';

const PurchaseOrdersPage = () => {
  const { user } = useAuth();
  const [pos, setPOs] = useState([]);
  const [filteredPOs, setFilteredPOs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // States for cancellation confirm dialog
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [poToCancel, setPOToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchPOs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await purchaseOrderService.getPOs();
      setPOs(response.data || []);
      setFilteredPOs(response.data || []);
    } catch (err) {
      console.error('Error fetching POs:', err);
      setError(err.message || 'Failed to retrieve purchase orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  // Filter list on search
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredPOs(pos);
    } else {
      const filtered = pos.filter(po => 
        po.poNumber.toLowerCase().includes(term) ||
        po.vendorName.toLowerCase().includes(term) ||
        po.status.toLowerCase().includes(term)
      );
      setFilteredPOs(filtered);
    }
  }, [searchTerm, pos]);

  const handleCancelClick = (po) => {
    setPOToCancel(po);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!poToCancel) return;
    setIsCancelling(true);
    setError('');
    setSuccess('');
    try {
      await purchaseOrderService.cancelPO(poToCancel._id);
      setSuccess(`Purchase Order ${poToCancel.poNumber} has been cancelled successfully.`);
      setCancelModalOpen(false);
      setPOToCancel(null);
      // Reload POs list
      fetchPOs();
    } catch (err) {
      setError(err.message || 'Failed to cancel the purchase order.');
      setCancelModalOpen(false);
    } finally {
      setIsCancelling(false);
    }
  };

  const canCreateOrEdit = ['Admin', 'Manager'].includes(user?.role);
  const canCancel = user?.role === 'Admin';

  const statusColors = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Open: 'bg-emerald-50 text-emerald-700 border-emerald-250',
    Closed: 'bg-blue-50 text-blue-700 border-blue-200',
    Cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <div className="space-y-6" id="po-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage corporate procurement agreements and vendor records.</p>
        </div>
        {canCreateOrEdit && (
          <Link
            to="/purchase-orders/create"
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98]"
            id="create-po-btn"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Purchase Order</span>
          </Link>
        )}
      </div>

      {/* Notifications */}
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

      {/* Control panel (Search & Info) */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search by PO number, vendor, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
          />
        </div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl text-center">
          Active Role: <span className="text-brand-650 font-bold">{user?.role}</span>
        </div>
      </div>

      {/* Table & List Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading purchase orders...</span>
        </div>
      ) : filteredPOs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
            <FileSpreadsheet className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Purchase Orders Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm ? 'No entries match your search criteria. Try modifying your search keywords.' : 'Get started by creating your first purchase order records.'}
          </p>
          {canCreateOrEdit && !searchTerm && (
            <Link
              to="/purchase-orders/create"
              className="mt-6 inline-flex items-center space-x-1.5 text-xs font-bold text-brand-650 hover:text-brand-500"
            >
              <span>Create PO</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="po-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Delivery Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredPOs.map((po) => {
                  const formattedDate = new Date(po.poDate).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  });
                  const expectedDelivery = po.expectedDeliveryDate 
                    ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '-';
                  
                  const isCancelled = po.status === 'Cancelled';
                  
                  return (
                    <tr key={po._id} className="group hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-brand-650">{po.poNumber}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{po.vendorName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{po.vendorEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{formattedDate}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{expectedDelivery}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {po.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {po.currency}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[po.status] || 'bg-slate-100'}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {canCreateOrEdit && !isCancelled ? (
                          <Link
                            to={`/purchase-orders/edit/${po._id}`}
                            className="inline-flex p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Edit Purchase Order"
                            id={`edit-po-link-${po.poNumber}`}
                          >
                            <Edit2 className="h-4.5 w-4.5" />
                          </Link>
                        ) : (
                          <span className="inline-block w-8"></span>
                        )}
                        {canCancel && !isCancelled && (
                          <button
                            onClick={() => handleCancelClick(po)}
                            className="inline-flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancel Purchase Order"
                            id={`cancel-po-btn-${po.poNumber}`}
                          >
                            <Ban className="h-4.5 w-4.5" />
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
            <span>Showing {filteredPOs.length} entries</span>
            <span>AP Invoice Automation System</span>
          </div>
        </div>
      )}

      {/* Confirmation modal for Cancellation */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="confirm-cancel-modal">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Cancel Purchase Order</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Are you sure you want to cancel Purchase Order <span className="font-semibold text-slate-800">{poToCancel?.poNumber}</span>? 
              This action updates the status of the procurement document to <span className="font-semibold text-rose-600">Cancelled</span> and cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => { setCancelModalOpen(false); setPOToCancel(null); }}
                className="px-4.5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors border border-slate-250"
                disabled={isCancelling}
              >
                No, Keep PO
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                disabled={isCancelling}
                id="modal-confirm-btn"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
