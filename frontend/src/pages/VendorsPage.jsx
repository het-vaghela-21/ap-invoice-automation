import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import vendorService from '../services/vendorService';
import { 
  Plus, Search, AlertCircle, CheckCircle2, Loader2, Edit, Check, X, ShieldAlert, Ban, Info
} from 'lucide-react';

const VendorsPage = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    vendorCode: '',
    vendorName: '',
    vendorEmail: '',
    vendorGST: '',
    vendorPhone: '',
    vendorAddress: '',
    mandatoryFields: ['invoiceNumber', 'poNumber', 'invoiceDate', 'totalAmount', 'gstNumber']
  });

  const availableMandatoryFields = [
    { id: 'invoiceNumber', label: 'Invoice Number' },
    { id: 'poNumber', label: 'PO Number' },
    { id: 'invoiceDate', label: 'Invoice Date' },
    { id: 'totalAmount', label: 'Total Amount' },
    { id: 'gstNumber', label: 'GST Number' }
  ];

  const fetchVendors = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await vendorService.getVendors();
      setVendors(response.data || []);
      setFilteredVendors(response.data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err.message || 'Failed to retrieve vendor records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Filter local lists
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(v => 
        (v.vendorName && v.vendorName.toLowerCase().includes(term)) ||
        (v.vendorCode && v.vendorCode.toLowerCase().includes(term)) ||
        (v.vendorGST && v.vendorGST.toLowerCase().includes(term)) ||
        (v.vendorEmail && v.vendorEmail.toLowerCase().includes(term))
      );
      setFilteredVendors(filtered);
    }
  }, [searchTerm, vendors]);

  const handleOpenCreateModal = () => {
    setFormData({
      vendorCode: '',
      vendorName: '',
      vendorEmail: '',
      vendorGST: '',
      vendorPhone: '',
      vendorAddress: '',
      mandatoryFields: ['invoiceNumber', 'poNumber', 'invoiceDate', 'totalAmount', 'gstNumber']
    });
    setModalMode('create');
    setModalOpen(true);
  };

  const handleOpenEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      vendorCode: vendor.vendorCode || '',
      vendorName: vendor.vendorName || '',
      vendorEmail: vendor.vendorEmail || '',
      vendorGST: vendor.vendorGST || '',
      vendorPhone: vendor.vendorPhone || '',
      vendorAddress: vendor.vendorAddress || '',
      mandatoryFields: vendor.mandatoryFields || []
    });
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (fieldId) => {
    setFormData(prev => {
      const current = prev.mandatoryFields;
      if (current.includes(fieldId)) {
        return {
          ...prev,
          mandatoryFields: current.filter(item => item !== fieldId)
        };
      } else {
        return {
          ...prev,
          mandatoryFields: [...current, fieldId]
        };
      }
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (modalMode === 'create') {
        await vendorService.createVendor(formData);
        setSuccess(`Vendor '${formData.vendorName}' created successfully.`);
      } else {
        await vendorService.updateVendor(selectedVendor._id, formData);
        setSuccess(`Vendor '${formData.vendorName}' updated successfully.`);
      }
      setModalOpen(false);
      fetchVendors();
    } catch (err) {
      console.error('Submit vendor failed:', err);
      if (err.errors && err.errors.length > 0) {
        setError(err.errors[0].msg || err.errors[0].message);
      } else {
        setError(err.message || 'Failed to save vendor details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (vendor) => {
    if (!window.confirm(`Are you sure you want to deactivate vendor '${vendor.vendorName}'? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await vendorService.deactivateVendor(vendor._id);
      setSuccess(`Vendor '${vendor.vendorName}' has been deactivated.`);
      fetchVendors();
    } catch (err) {
      console.error('Deactivate vendor failed:', err);
      setError(err.message || 'Failed to deactivate vendor.');
      setIsLoading(false);
    }
  };

  const canWrite = ['Admin', 'Manager'].includes(user?.role);
  const canDeactivate = user?.role === 'Admin';

  return (
    <div className="space-y-6" id="vendors-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vendors</h1>
          <p className="text-slate-500 text-sm mt-1">Manage external business entities, mandatory matching requirements, and GST validation profiles.</p>
        </div>
        {canWrite && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98]"
            id="create-vendor-btn"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Vendor</span>
          </button>
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

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search by vendor name, code, GST, email..."
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
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading business vendors...</span>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Vendors Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm ? 'No vendors match your search query.' : 'Create vendors to link purchase orders and enforce mandatory invoice fields.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="vendors-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  <th className="px-6 py-4">Vendor Code</th>
                  <th className="px-6 py-4">Vendor Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">GST Number</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Required Fields</th>
                  <th className="px-6 py-4">Status</th>
                  {canWrite && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredVendors.map((vendor) => {
                  return (
                    <tr key={vendor._id} className={`group hover:bg-slate-50/40 transition-colors ${!vendor.isActive ? 'opacity-65' : ''}`}>
                      <td className="px-6 py-4 font-bold text-slate-900">{vendor.vendorCode}</td>
                      <td className="px-6 py-4 font-semibold text-brand-650">{vendor.vendorName}</td>
                      <td className="px-6 py-4 text-slate-600 text-xs">{vendor.vendorEmail}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">{vendor.vendorGST}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{vendor.vendorPhone || '-'}</td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {vendor.mandatoryFields && vendor.mandatoryFields.map(f => (
                            <span key={f} className="inline-block bg-slate-100 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-slate-600">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          vendor.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canWrite && (
                        <td className="px-6 py-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(vendor)}
                            className="inline-flex p-2 text-slate-400 hover:text-brand-650 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Edit Vendor"
                            id={`edit-vendor-btn-${vendor.vendorCode}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {canDeactivate && vendor.isActive && (
                            <button
                              onClick={() => handleDeactivate(vendor)}
                              className="inline-flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Deactivate Vendor"
                              id={`deactivate-vendor-btn-${vendor.vendorCode}`}
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creation/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="vendor-modal">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {modalMode === 'create' ? 'Create Business Vendor' : 'Edit Vendor Profile'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Vendor Code */}
                <div>
                  <label htmlFor="vendorCode" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vendor Code
                  </label>
                  <input
                    type="text"
                    id="vendorCode"
                    name="vendorCode"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="e.g. VEN-001"
                    value={formData.vendorCode}
                    onChange={handleInputChange}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold disabled:opacity-60"
                  />
                </div>

                {/* Vendor Name */}
                <div>
                  <label htmlFor="vendorName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    id="vendorName"
                    name="vendorName"
                    required
                    placeholder="e.g. Acme Corp Solutions"
                    value={formData.vendorName}
                    onChange={handleInputChange}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-semibold"
                  />
                </div>

                {/* Vendor Email */}
                <div>
                  <label htmlFor="vendorEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vendor Email
                  </label>
                  <input
                    type="email"
                    id="vendorEmail"
                    name="vendorEmail"
                    required
                    placeholder="e.g. billing@acme.com"
                    value={formData.vendorEmail}
                    onChange={handleInputChange}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                  />
                </div>

                {/* Vendor GST */}
                <div>
                  <label htmlFor="vendorGST" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Vendor GSTIN
                  </label>
                  <input
                    type="text"
                    id="vendorGST"
                    name="vendorGST"
                    required
                    placeholder="e.g. 22AAAAA1111A1Z1"
                    value={formData.vendorGST}
                    onChange={handleInputChange}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm font-mono"
                  />
                </div>

                {/* Vendor Phone */}
                <div>
                  <label htmlFor="vendorPhone" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="vendorPhone"
                    name="vendorPhone"
                    placeholder="e.g. +1 (555) 019-2834"
                    value={formData.vendorPhone}
                    onChange={handleInputChange}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                  />
                </div>

                {/* Vendor Address */}
                <div>
                  <label htmlFor="vendorAddress" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Business Address
                  </label>
                  <input
                    type="text"
                    id="vendorAddress"
                    name="vendorAddress"
                    placeholder="e.g. 128 Business St, Suite 400"
                    value={formData.vendorAddress}
                    onChange={handleInputChange}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/80 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Mandatory Fields Array Checkboxes */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <Info className="h-4 w-4 text-brand-500" />
                  <span>Mandatory Invoice Validation Fields</span>
                </div>
                <p className="text-xs text-slate-500">Select which fields the validation engine must require for invoices associated with this vendor.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {availableMandatoryFields.map(f => {
                    const isChecked = formData.mandatoryFields.includes(f.id);
                    return (
                      <label 
                        key={f.id} 
                        className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-brand-50/40 border-brand-300 text-brand-900 font-semibold' 
                            : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(f.id)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                        <span className="text-xs">{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-slate-550 hover:bg-slate-550/5 border border-slate-250 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-brand-600/15 active:scale-[0.98] disabled:opacity-85"
                  id="submit-vendor-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{modalMode === 'create' ? 'Save Vendor' : 'Apply Changes'}</span>
                    </>
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

export default VendorsPage;
