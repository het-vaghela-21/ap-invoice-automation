import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import purchaseOrderService from '../services/purchaseOrderService';
import vendorService from '../services/vendorService';
import { ArrowLeft, Save, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';

const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    poNumber: '',
    vendorId: '',
    vendorName: '',
    vendorEmail: '',
    poDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    totalAmount: '',
    currency: 'USD',
    status: 'Open' // Default starting state for newly created POs
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActiveVendors = async () => {
      try {
        const response = await vendorService.getVendors();
        setVendors((response.data || []).filter(v => v.isActive));
      } catch (err) {
        console.error('Failed to retrieve active vendors:', err);
        setError('Failed to load active vendors. Please ensure vendors are configured.');
      }
    };
    fetchActiveVendors();
  }, []);

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
    setIsLoading(true);
    setError('');

    // Pre-validate amount client side
    const amountVal = parseFloat(formData.totalAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Total amount must be greater than zero.');
      setIsLoading(false);
      return;
    }

    try {
      await purchaseOrderService.createPO({
        ...formData,
        totalAmount: amountVal
      });
      navigate('/purchase-orders');
    } catch (err) {
      console.error('Error creating PO:', err);
      // Capture express-validator array error details or custom schema constraints
      if (err.errors && err.errors.length > 0) {
        setError(err.errors[0].msg);
      } else {
        setError(err.message || 'Failed to create purchase order.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="create-po-page">
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Purchase Order</h1>
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
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6 max-w-4xl">
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
              placeholder="e.g. PO-2026-0001"
              value={formData.poNumber}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold"
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
                value={formData.vendorId}
                onChange={handleVendorSelect}
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold cursor-pointer"
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
                placeholder="0.00"
                value={formData.totalAmount}
                onChange={handleChange}
                className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-bold"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-bold cursor-pointer"
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
              value={formData.poDate}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
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
              value={formData.expectedDeliveryDate}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
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
              value={formData.status}
              onChange={handleChange}
              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold cursor-pointer"
            >
              <option value="Draft">Draft</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
          <Link
            to="/purchase-orders"
            className="px-5 py-3 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98] disabled:opacity-80"
            id="submit-po-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>Saving PO...</span>
              </>
            ) : (
              <>
                <Save className="h-4.5 w-4.5" />
                <span>Save Purchase Order</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePurchaseOrderPage;
