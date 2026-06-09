import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, ZoomIn, ZoomOut, RotateCcw, 
  AlertCircle, CheckCircle2, Loader2, Save, FileText,
  User, Calendar, Info, CornerUpLeft, Play, XCircle, ShieldAlert, CheckSquare
} from 'lucide-react';
import { apiClient } from '../services/authService';

const ValidationWorkspacePage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [invoice, setInvoice] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [fields, setFields] = useState({
    invoiceNumber: '',
    poNumber: '',
    vendorName: '',
    invoiceDate: '',
    totalAmount: '',
    taxAmount: '',
    gstNumber: ''
  });
  const [originalFields, setOriginalFields] = useState({});
  const [zoom, setZoom] = useState(1.0);
  const [pdfError, setPdfError] = useState(false);
  const [mockPdfText, setMockPdfText] = useState('');

  // Loaded engine verification states
  const [validationErrors, setValidationErrors] = useState([]);
  const [poMatchMessage, setPoMatchMessage] = useState('');

  const fetchWorkspaceData = async (shouldResetForm = true) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/validation/${invoiceId}`);
      if (response?.data?.status === 'success' && response.data.data) {
        const { invoice: inv, vendorsList } = response.data.data;
        setInvoice(inv);
        setVendors(vendorsList || []);
        
        const currentVendorId = inv.matchedVendor?._id || inv.matchedVendor || '';
        setSelectedVendorId(currentVendorId);

        const formFields = {
          invoiceNumber: inv.extractedData?.invoiceNumber || '',
          poNumber: inv.extractedData?.poNumber || '',
          vendorName: inv.extractedData?.vendorName || '',
          invoiceDate: inv.extractedData?.invoiceDate || '',
          totalAmount: inv.extractedData?.totalAmount !== null && inv.extractedData?.totalAmount !== undefined ? String(inv.extractedData.totalAmount) : '',
          taxAmount: inv.extractedData?.taxAmount !== null && inv.extractedData?.taxAmount !== undefined ? String(inv.extractedData.taxAmount) : '',
          gstNumber: inv.extractedData?.gstNumber || ''
        };

        if (shouldResetForm) {
          setFields(formFields);
          setOriginalFields(formFields);
        }

        // Run validation display checks locally based on the loaded invoice state
        calculateValidationIndicators(inv, vendorsList, currentVendorId, formFields);
      } else {
        setError('Failed to load validation workspace data.');
      }
    } catch (err) {
      console.error('Fetch validation workspace failed:', err);
      setError(err.response?.data?.message || 'Error loading validation workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateValidationIndicators = (inv, vendorsList, currentVendorId, currentFields) => {
    const activeVendor = vendorsList.find(v => v._id === currentVendorId);
    const errors = [];
    
    if (!currentVendorId) {
      errors.push('Vendor matching required.');
    } else if (activeVendor) {
      // Check mandatory fields
      const fieldMapping = {
        invoiceNumber: 'Invoice Number',
        poNumber: 'PO Number',
        vendorName: 'Vendor Name',
        invoiceDate: 'Invoice Date',
        totalAmount: 'Total Amount',
        gstNumber: 'GST Number'
      };

      activeVendor.mandatoryFields.forEach(f => {
        if (!currentFields[f] || String(currentFields[f]).trim() === '') {
          errors.push(`Missing mandatory field: ${fieldMapping[f] || f}`);
        }
      });
    }

    setValidationErrors(errors);

    // PO match explanation
    if (!currentFields.poNumber) {
      setPoMatchMessage('No Purchase Order number specified.');
    } else if (inv.matchingStatus === 'Matched') {
      setPoMatchMessage('PO matches successfully (number and amount match).');
    } else if (inv.matchingStatus === 'Mismatch') {
      setPoMatchMessage('PO mismatch (either PO does not exist for vendor, or total amount is different).');
    } else {
      setPoMatchMessage('Awaiting matching.');
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchWorkspaceData(true);
    }
  }, [invoiceId]);

  // Verify mock PDF contents
  useEffect(() => {
    if (invoice && invoice.invoiceFileUrl) {
      const isPdf = invoice.invoiceFileUrl.toLowerCase().endsWith('.pdf') || invoice.invoiceFileUrl.includes('raw');
      if (isPdf) {
        setPdfError(false);
        setMockPdfText('');
        fetch(invoice.invoiceFileUrl)
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
    }
  }, [invoice]);

  const isAuthorized = user && ['Admin', 'Manager', 'AccountsExecutive'].includes(user.role);
  const isLocked = invoice && (invoice.reviewStatus === 'ReadyForPayment' || invoice.invoiceDecision === 'Rejected');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.5));
  const handleZoomReset = () => setZoom(1.0);

  const handleInputChange = (e) => {
    if (isLocked) return;
    const { name, value } = e.target;
    setFields(prev => {
      const updated = { ...prev, [name]: value };
      calculateValidationIndicators(invoice, vendors, selectedVendorId, updated);
      return updated;
    });
  };

  const handleResetField = (fieldName) => {
    if (isLocked) return;
    setFields(prev => {
      const updated = { ...prev, [fieldName]: originalFields[fieldName] || '' };
      calculateValidationIndicators(invoice, vendors, selectedVendorId, updated);
      return updated;
    });
  };

  // Actions
  const handleSaveChanges = async () => {
    if (isLocked || isActioning) return;
    setIsActioning(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.put(`/validation/${invoiceId}`, {
        fields,
        vendorId: selectedVendorId
      });
      if (response.data.status === 'success') {
        setSuccess('Changes saved successfully.');
        await fetchWorkspaceData(false);
      }
    } catch (err) {
      console.error('Save changes failed:', err);
      setError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleReRunValidation = async () => {
    if (isLocked || isActioning) return;
    setIsActioning(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post(`/validation/${invoiceId}/validate`, {
        fields,
        vendorId: selectedVendorId
      });
      if (response.data.status === 'success') {
        setSuccess('Validation and matching completed successfully.');
        await fetchWorkspaceData(false);
      }
    } catch (err) {
      console.error('Re-run validation failed:', err);
      setError(err.response?.data?.message || 'Failed to re-run validation.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleFinalize = async () => {
    if (isLocked || isActioning) return;
    setIsActioning(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post(`/validation/${invoiceId}/finalize`, {
        fields,
        vendorId: selectedVendorId
      });
      if (response.data.status === 'success') {
        navigate('/validation', {
          state: {
            successMessage: 'Invoice has been successfully finalized and accepted for payment.'
          }
        });
      }
    } catch (err) {
      console.error('Finalization failed:', err);
      setError(err.response?.data?.message || 'Failed to finalize invoice.');
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async () => {
    if (isLocked || isActioning) return;
    setIsActioning(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.post(`/validation/${invoiceId}/reject`, {
        fields,
        vendorId: selectedVendorId
      });
      if (response.data.status === 'success') {
        navigate('/validation', {
          state: {
            successMessage: 'Invoice has been manually rejected and locked.'
          }
        });
      }
    } catch (err) {
      console.error('Rejection failed:', err);
      setError(err.response?.data?.message || 'Failed to reject invoice.');
    } finally {
      setIsActioning(false);
    }
  };

  if (!isAuthorized && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md mx-auto my-12 text-center" id="access-denied-view">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Access Denied</h3>
        <p className="text-slate-500 text-sm mt-2">
          Your current security role ({user?.role || 'Guest'}) does not have permission to access the Validation Workspace.
        </p>
        <Link to="/validation" className="mt-6 inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-sm transition-colors hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Validation Queue</span>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[400px]">
        <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading Validation Workspace...</span>
      </div>
    );
  }

  const isPdf = invoice?.invoiceFileUrl?.toLowerCase().endsWith('.pdf') || invoice?.invoiceFileUrl?.includes('raw');
  const activeVendor = vendors.find(v => v._id === selectedVendorId);

  // Confidence highlights helper
  const getFieldHighlight = (fieldName) => {
    const score = invoice.confidenceScores?.[fieldName];
    if (score === null || score === undefined) {
      return {
        inputClass: 'border-slate-250 bg-white focus:ring-brand-500 focus:border-brand-500',
        badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
        isLow: false,
        scoreText: 'N/A'
      };
    }

    if (score > 90) {
      return {
        inputClass: 'border-slate-250 bg-white focus:ring-brand-500 focus:border-brand-550',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 border',
        isLow: false,
        scoreText: `${score}%`
      };
    } else if (score >= 70) {
      return {
        inputClass: 'border-amber-300 bg-amber-50/15 focus:ring-amber-500 focus:border-amber-500 focus:bg-white',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-350 border',
        isLow: false,
        scoreText: `${score}%`
      };
    } else {
      return {
        inputClass: 'border-rose-300 bg-rose-50/15 focus:ring-rose-500 focus:border-rose-500 focus:bg-white',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-350 border',
        isLow: true,
        scoreText: `${score}%`
      };
    }
  };

  const isMandatory = (fieldKey) => activeVendor?.mandatoryFields.includes(fieldKey) || false;

  return (
    <div className="space-y-6" id="validation-workspace-page">
      {/* Top sticky navigation headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <Link 
            to="/validation"
            className="inline-flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Return to list"
            id="workspace-back-link"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Validation Workspace</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                invoice.reviewStatus === 'ReadyForPayment'
                  ? 'bg-emerald-55 bg-emerald-50 text-emerald-700 border-emerald-250'
                  : invoice.invoiceDecision === 'Rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-250'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-250'
              }`}>
                {invoice.reviewStatus === 'ReadyForPayment' ? 'Ready For Payment' : invoice.invoiceDecision === 'Rejected' ? 'Rejected' : 'Awaiting Validation'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate max-w-lg mt-0.5">
              {invoice.originalFileName || 'Invoice Validation'}
            </h1>
          </div>
        </div>

        {/* Locked State Audit Banner */}
        {isLocked && (
          <div className="flex items-center space-x-2.5 bg-slate-100 border border-slate-250 px-4 py-2.5 rounded-xl text-xs text-slate-700 shadow-sm animate-fade-in">
            <ShieldAlert className="h-4.5 w-4.5 text-slate-500" />
            <span>
              Locked: Invoice decision is <span className="font-extrabold uppercase">{invoice.invoiceDecision}</span>. Reviewed by <span className="font-bold">{invoice.reviewedBy ? `${invoice.reviewedBy.firstName} ${invoice.reviewedBy.lastName}` : 'System'}</span> on <span className="font-bold">{new Date(invoice.reviewedAt).toLocaleString()}</span>
            </span>
          </div>
        )}
      </div>

      {/* Warnings & Errors */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="workspace-error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span style={{ whiteSpace: 'pre-wrap' }}>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="workspace-success-alert">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-555 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-20">
        
        {/* LEFT PANEL: Document Preview */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[750px]">
          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-center space-x-1.5">
              <FileText className="h-4.5 w-4.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Invoice Preview</span>
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

          {/* Embed */}
          <div className="flex-1 bg-slate-100 overflow-auto relative p-4 flex items-start justify-center">
            {invoice.invoiceFileUrl ? (
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

        {/* RIGHT PANEL: Validation & Match Workspace */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[750px]">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Validation Fields</h2>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Info className="h-4 w-4 text-brand-555 text-brand-500" />
              <span>Matching is validated on re-run</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Decision Status Panel */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Final Decision</span>
                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${
                  invoice.invoiceDecision === 'Accepted'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : invoice.invoiceDecision === 'Rejected'
                    ? 'bg-rose-50 text-rose-700 border-rose-250'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-250'
                }`}>
                  {invoice.invoiceDecision || 'Pending'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Vendor Match Score</span>
                <span className={`font-extrabold text-sm ${invoice.vendorSimilarityScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {invoice.vendorSimilarityScore !== undefined ? `${invoice.vendorSimilarityScore}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Validation Errors banner */}
            {validationErrors.length > 0 && (
              <div className="bg-rose-50/55 border border-rose-100 text-rose-750 p-3.5 rounded-xl text-xs space-y-1">
                <span className="font-extrabold block text-rose-800 uppercase tracking-wide">Validation Warnings:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {validationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            )}

            {/* PO Match Result banner */}
            <div className={`p-3.5 rounded-xl text-xs border ${
              invoice.matchingStatus === 'Matched' 
                ? 'bg-emerald-50/55 border-emerald-100 text-emerald-800'
                : invoice.matchingStatus === 'Mismatch'
                ? 'bg-orange-50/55 border-orange-100 text-orange-850'
                : 'bg-slate-50 border-slate-100 text-slate-600'
            }`}>
              <span className="font-extrabold block uppercase tracking-wide">PO Matching Status: {invoice.matchingStatus}</span>
              <span className="block mt-0.5 font-medium">{poMatchMessage}</span>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 pt-2">
              
              {/* Field: Matched Vendor */}
              <div className="space-y-1 pb-2 border-b border-slate-100">
                <label htmlFor="vendorId" className="block text-xs font-bold text-slate-700">
                  Matched Vendor <span className="text-rose-500">*</span>
                </label>
                <select
                  id="vendorId"
                  name="vendorId"
                  required
                  disabled={isLocked}
                  value={selectedVendorId}
                  onChange={(e) => {
                    const vId = e.target.value;
                    setSelectedVendorId(vId);
                    const vObj = vendors.find(v => v._id === vId);
                    setFields(prev => {
                      const updated = {
                        ...prev,
                        vendorName: vObj ? vObj.vendorName : prev.vendorName,
                        gstNumber: vObj ? vObj.vendorGST : prev.gstNumber
                      };
                      calculateValidationIndicators(invoice, vendors, vId, updated);
                      return updated;
                    });
                  }}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-80 transition-all text-sm font-semibold cursor-pointer"
                >
                  <option value="">-- Match Business Vendor --</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.vendorName} ({v.vendorCode}) [Match: {v.similarityScore}%]
                    </option>
                  ))}
                </select>
              </div>

              {/* Field: Invoice Number */}
              {(() => {
                const highlight = getFieldHighlight('invoiceNumber');
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="invoiceNumber" className="font-bold text-slate-700">
                        Invoice Number {isMandatory('invoiceNumber') && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`}>
                          OCR: {highlight.scoreText}
                        </span>
                        {!isLocked && fields.invoiceNumber !== originalFields.invoiceNumber && (
                          <button
                            type="button"
                            onClick={() => handleResetField('invoiceNumber')}
                            className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[9px] font-bold"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Revert</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      id="invoiceNumber"
                      name="invoiceNumber"
                      disabled={isLocked}
                      value={fields.invoiceNumber}
                      onChange={handleInputChange}
                      className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-85 transition-all ${highlight.inputClass}`}
                    />
                  </div>
                );
              })()}

              {/* Field: PO Number */}
              {(() => {
                const highlight = getFieldHighlight('poNumber');
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="poNumber" className="font-bold text-slate-700">
                        PO Number {isMandatory('poNumber') && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`}>
                          OCR: {highlight.scoreText}
                        </span>
                        {!isLocked && fields.poNumber !== originalFields.poNumber && (
                          <button
                            type="button"
                            onClick={() => handleResetField('poNumber')}
                            className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[9px] font-bold"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Revert</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      id="poNumber"
                      name="poNumber"
                      disabled={isLocked}
                      value={fields.poNumber}
                      onChange={handleInputChange}
                      className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-85 transition-all ${highlight.inputClass}`}
                    />
                  </div>
                );
              })()}

              {/* Field: Vendor Name */}
              {(() => {
                const highlight = getFieldHighlight('vendorName');
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="vendorName" className="font-bold text-slate-700">
                        Vendor Name {isMandatory('vendorName') && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`}>
                          OCR: {highlight.scoreText}
                        </span>
                        {!isLocked && fields.vendorName !== originalFields.vendorName && (
                          <button
                            type="button"
                            onClick={() => handleResetField('vendorName')}
                            className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[9px] font-bold"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Revert</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      id="vendorName"
                      name="vendorName"
                      disabled={isLocked}
                      value={fields.vendorName}
                      onChange={handleInputChange}
                      className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-85 transition-all ${highlight.inputClass}`}
                    />
                  </div>
                );
              })()}

              {/* Field: Invoice Date */}
              {(() => {
                const highlight = getFieldHighlight('invoiceDate');
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="invoiceDate" className="font-bold text-slate-700">
                        Invoice Date {isMandatory('invoiceDate') && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`}>
                          OCR: {highlight.scoreText}
                        </span>
                        {!isLocked && fields.invoiceDate !== originalFields.invoiceDate && (
                          <button
                            type="button"
                            onClick={() => handleResetField('invoiceDate')}
                            className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[9px] font-bold"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Revert</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      id="invoiceDate"
                      name="invoiceDate"
                      disabled={isLocked}
                      value={fields.invoiceDate}
                      onChange={handleInputChange}
                      className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-85 transition-all ${highlight.inputClass}`}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                );
              })()}

              {/* Field: Total Amount */}
              {(() => {
                const highlight = getFieldHighlight('totalAmount');
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="totalAmount" className="font-bold text-slate-700">
                        Total Amount ($) {isMandatory('totalAmount') && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`}>
                          OCR: {highlight.scoreText}
                        </span>
                        {!isLocked && fields.totalAmount !== originalFields.totalAmount && (
                          <button
                            type="button"
                            onClick={() => handleResetField('totalAmount')}
                            className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[9px] font-bold"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Revert</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      id="totalAmount"
                      name="totalAmount"
                      disabled={isLocked}
                      value={fields.totalAmount}
                      onChange={handleInputChange}
                      className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-85 transition-all ${highlight.inputClass}`}
                    />
                  </div>
                );
              })()}

              {/* Field: Tax Amount */}
              {(() => {
                const highlight = getFieldHighlight('taxAmount');
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="taxAmount" className="font-bold text-slate-700">
                        Tax Amount ($) {isMandatory('taxAmount') && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`}>
                          OCR: {highlight.scoreText}
                        </span>
                        {!isLocked && fields.taxAmount !== originalFields.taxAmount && (
                          <button
                            type="button"
                            onClick={() => handleResetField('taxAmount')}
                            className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[9px] font-bold"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Revert</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      id="taxAmount"
                      name="taxAmount"
                      disabled={isLocked}
                      value={fields.taxAmount}
                      onChange={handleInputChange}
                      className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-85 transition-all ${highlight.inputClass}`}
                    />
                  </div>
                );
              })()}

              {/* Field: GST Number */}
              {(() => {
                const highlight = getFieldHighlight('gstNumber');
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label htmlFor="gstNumber" className="font-bold text-slate-700">
                        GST Number {isMandatory('gstNumber') && <span className="text-rose-500">*</span>}
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`}>
                          OCR: {highlight.scoreText}
                        </span>
                        {!isLocked && fields.gstNumber !== originalFields.gstNumber && (
                          <button
                            type="button"
                            onClick={() => handleResetField('gstNumber')}
                            className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[9px] font-bold"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Revert</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      id="gstNumber"
                      name="gstNumber"
                      disabled={isLocked}
                      value={fields.gstNumber}
                      onChange={handleInputChange}
                      className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:opacity-85 transition-all ${highlight.inputClass}`}
                    />
                  </div>
                );
              })()}

            </div>

          </div>

          {/* Action buttons footer */}
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
            <div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isActioning}
                  className="inline-flex items-center space-x-1.5 px-4.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors rounded-xl border border-rose-200 active:scale-[0.98]"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject Invoice</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Link
                to="/validation"
                className="px-5 py-2.5 border border-slate-250 text-slate-550 rounded-xl text-xs font-semibold transition-colors hover:bg-slate-100"
              >
                {isLocked ? 'Close' : 'Cancel'}
              </Link>
              
              {!isLocked && (
                <>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isActioning}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-250 rounded-xl transition-all active:scale-[0.98]"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReRunValidation}
                    disabled={isActioning}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 font-semibold text-xs border border-indigo-200 rounded-xl transition-all active:scale-[0.98]"
                  >
                    <Play className="h-4 w-4 animate-pulse" />
                    <span>Re-Run Validation</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={isActioning || validationErrors.length > 0 || invoice.matchingStatus !== 'Matched'}
                    className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-emerald-600/10 rounded-xl transition-all active:scale-[0.98]"
                    title={
                      validationErrors.length > 0 || invoice.matchingStatus !== 'Matched'
                        ? 'All validation errors must be cleared and PO must match before finalizing.'
                        : 'Finalize & Accept Invoice'
                    }
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Finalize Invoice</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ValidationWorkspacePage;
