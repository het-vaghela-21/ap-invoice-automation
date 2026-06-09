import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import purchaseOrderService from '../services/purchaseOrderService';
import vendorService from '../services/vendorService';
import { ArrowLeft, Save, AlertCircle, Loader2 } from 'lucide-react';

const EditPurchaseOrderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    poNumber: '',
    vendorId: '',
    vendorName: '',
    vendorEmail: '',
    poDate: '',
    expectedDeliveryDate: '',
    totalAmount: '',
    currency: 'USD',
    status: 'Draft'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActiveVendors = async () => {
      try {
        const response = await vendorService.getVendors();
        setVendors(response.data || []);
      } catch (err) {
        console.error('Failed to load active vendors:', err);
      }
    };
    fetchActiveVendors();
  }, []);

  useEffect(() => {
    const fetchPO = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await purchaseOrderService.getPOById(id);
        const po = response.data;
        if (po) {
          // Format dates for html date input (YYYY-MM-DD)
          const formattedPoDate = po.poDate ? new Date(po.poDate).toISOString().split('T')[0] : '';
          const formattedDeliveryDate = po.expectedDeliveryDate 
            ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0] 
            : '';

          setFormData({
            poNumber: po.poNumber || '',
            vendorId: po.vendorId?._id || po.vendorId || '',
            vendorName: po.vendorName || '',
            vendorEmail: po.vendorEmail || '',
            poDate: formattedPoDate,
            expectedDeliveryDate: formattedDeliveryDate,
            totalAmount: po.totalAmount || '',
            currency: po.currency || 'USD',
            status: po.status || 'Draft'
          });
        }
      } catch (err) {
        console.error('Error fetching PO:', err);
        setError(err.message || 'Failed to retrieve purchase order details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPO();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVendorSelect = (e) => {
    const selectedId = e.target.value;
    const selectedVendor = vendors.find(v => v._id === selectedId);
    setFormData((prev) => ({
      ...prev,
      vendorId: selectedId,
      vendorName: selectedVendor ? selectedVendor.vendorName : '',
      vendorEmail: selectedVendor ? selectedVendor.vendorEmail : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const amountVal = parseFloat(formData.totalAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Total amount must be greater than zero.');
      setIsSaving(false);
      return;
    }

    try {
      await purchaseOrderService.updatePO(id, {
        ...formData,
        totalAmount: amountVal
      });
      navigate('/purchase-orders');
    } catch (err) {
      console.error('Error updating PO:', err);
      if (err.errors && err.errors.length > 0) {
        setError(err.errors[0].msg);
      } else {
        setError(err.message || 'Failed to update purchase order.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isCancelled = formData.status === 'Cancelled';

  return (
    <div className="space-y-6" id="edit-po-page">
      {/* Top Breadcrumb */}
      <div className="flex items-center space-x-2.5">
        <Link 
          to="/purchase-orders"
          className="inline-flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          id="back-list-link"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Orders</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Purchase Order</h1>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Container */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading purchase order details...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6 max-w-4xl">
          {isCancelled && (
            <div className="bg-amber-50 border border-amber-250 text-amber-800 p-4 rounded-xl flex items-start space-x-3 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
              <span>
                <strong>Warning:</strong> This Purchase Order is marked as <strong>Cancelled</strong>. Updates are restricted.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PO Number */}
            <div>
              <label htmlFor="poNumber" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                PO Number
              </label>
              <input
                type="text"
                id="poNumber"
                name="poNumber"
                required
                disabled={isCancelled}
                placeholder="e.g. PO-2026-0001"
                value={formData.poNumber}
                onChange={handleChange}
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold disabled:opacity-60"
              />
            </div>

            {/* Vendor Selection */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="vendorId" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Vendor *
                </label>
                <select
                  id="vendorId"
                  name="vendorId"
                  required
                  disabled={isCancelled}
                  value={formData.vendorId}
                  onChange={handleVendorSelect}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.vendorName} ({v.vendorCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Vendor Name (Auto)
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.vendorName}
                  className="block w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Vendor Email (Auto)
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.vendorEmail}
                  className="block w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Total Amount & Currency */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label htmlFor="totalAmount" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Total Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="totalAmount"
                  name="totalAmount"
                  required
                  disabled={isCancelled}
                  placeholder="0.00"
                  value={formData.totalAmount}
                  onChange={handleChange}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-bold disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="currency" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  disabled={isCancelled}
                  value={formData.currency}
                  onChange={handleChange}
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-bold cursor-pointer disabled:opacity-65"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            {/* PO Date */}
            <div>
              <label htmlFor="poDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                PO Date
              </label>
              <input
                type="date"
                id="poDate"
                name="poDate"
                required
                disabled={isCancelled}
                value={formData.poDate}
                onChange={handleChange}
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm disabled:opacity-60"
              />
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label htmlFor="expectedDeliveryDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Expected Delivery Date
              </label>
              <input
                type="date"
                id="expectedDeliveryDate"
                name="expectedDeliveryDate"
                disabled={isCancelled}
                value={formData.expectedDeliveryDate}
                onChange={handleChange}
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm disabled:opacity-60"
              />
            </div>

            {/* Status Dropdown */}
            <div>
              <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                disabled={isCancelled}
                value={formData.status}
                onChange={handleChange}
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold cursor-pointer disabled:opacity-65"
              >
                <option value="Draft">Draft</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                {isCancelled && <option value="Cancelled">Cancelled</option>}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <Link
              to="/purchase-orders"
              className="px-5 py-3 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold transition-colors"
            >
              Back
            </Link>
            {!isCancelled && (
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98] disabled:opacity-80"
                id="submit-po-btn"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Saving PO...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4.5 w-4.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default EditPurchaseOrderPage;
