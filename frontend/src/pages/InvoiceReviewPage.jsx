import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import invoiceService from '../services/invoiceService';
import vendorService from '../services/vendorService';
import { 
  ArrowLeft, ZoomIn, ZoomOut, RotateCcw, 
  AlertCircle, CheckCircle2, Loader2, Save, FileText,
  User, Calendar, Info, CornerUpLeft
} from 'lucide-react';

const InvoiceReviewPage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Loading, error, and success states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Invoice states
  const [invoiceFileUrl, setInvoiceFileUrl] = useState('');
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [mandatoryFields, setMandatoryFields] = useState([]);
  const [originalFields, setOriginalFields] = useState({});
  const [fields, setFields] = useState({
    invoiceNumber: '',
    poNumber: '',
    vendorName: '',
    invoiceDate: '',
    totalAmount: '',
    taxAmount: '',
    gstNumber: ''
  });
  const [confidenceScores, setConfidenceScores] = useState({});
  const [reviewStatus, setReviewStatus] = useState('PendingReview');
  const [reviewedBy, setReviewedBy] = useState(null);
  const [reviewedAt, setReviewedAt] = useState(null);
  const [fileName, setFileName] = useState('');
  const [extractionStatus, setExtractionStatus] = useState('Pending');
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [mockPdfText, setMockPdfText] = useState('');

  // Zoom control state
  const [zoom, setZoom] = useState(1.0);

  const fetchInvoiceData = async (shouldTriggerExtract = true) => {
    setIsLoading(true);
    setError('');
    try {
      // Load vendors first
      const vendorResponse = await vendorService.getVendors();
      const vendorList = vendorResponse.data || [];
      setVendors(vendorList);

      const response = await invoiceService.getReviewData(invoiceId);
      if (response?.status === 'success' && response.data) {
        const { invoiceFileUrl, extractionStatus: extStatus, extractedData, confidenceScores, reviewStatus, matchedVendor, reviewedBy, reviewedAt } = response.data;
        
        setInvoiceFileUrl(invoiceFileUrl || '');
        setConfidenceScores(confidenceScores || {});
        setReviewStatus(reviewStatus || 'PendingReview');
        setReviewedBy(reviewedBy || null);
        setReviewedAt(reviewedAt || null);
        setExtractionStatus(extStatus || 'Pending');
        
        // Reconstruct file name from URL if possible
        if (invoiceFileUrl) {
          const parts = invoiceFileUrl.split('/');
          setFileName(parts[parts.length - 1]);
        }

        // 1. If extraction status is Pending or Failed, trigger it automatically!
        if (shouldTriggerExtract && (extStatus === 'Pending' || extStatus === 'Failed')) {
          setIsExtracting(true);
          try {
            await invoiceService.triggerExtraction(invoiceId);
            setExtractionStatus('Processing');
          } catch (triggerErr) {
            console.error('Auto OCR trigger failed:', triggerErr);
          }
        } else if (extStatus === 'Processing') {
          setIsExtracting(true);
        } else {
          setIsExtracting(false);
        }

        // Let's determine matched vendor ID
        let currentVendorId = matchedVendor?._id || matchedVendor || '';

        // If no vendor matched by backend, try to match in frontend
        if (!currentVendorId && vendorList.length > 0) {
          const extName = (extractedData?.vendorName || '').toLowerCase().trim();
          const extGst = (extractedData?.gstNumber || '').toLowerCase().trim();
          
          // Try matching by GST first
          let matchedFrontend = vendorList.find(v => v.vendorGST && v.vendorGST.toLowerCase().trim() === extGst);
          
          // Try matching by name substring
          if (!matchedFrontend && extName) {
            matchedFrontend = vendorList.find(v => {
              const vName = v.vendorName.toLowerCase().trim();
              return vName.includes(extName) || extName.includes(vName);
            });
          }
          
          // Fallback to first vendor if no match found
          if (!matchedFrontend) {
            matchedFrontend = vendorList[0];
          }
          
          if (matchedFrontend) {
            currentVendorId = matchedFrontend._id;
          }
        }

        setSelectedVendorId(currentVendorId);
        
        const vendorObj = vendorList.find(v => v._id === currentVendorId);
        setMandatoryFields(vendorObj ? vendorObj.mandatoryFields : []);

        // Set form fields
        const formFields = {
          invoiceNumber: extractedData?.invoiceNumber || '',
          poNumber: extractedData?.poNumber || '',
          vendorName: extractedData?.vendorName || (vendorObj ? vendorObj.vendorName : ''),
          invoiceDate: extractedData?.invoiceDate || '',
          totalAmount: extractedData?.totalAmount !== null && extractedData?.totalAmount !== undefined ? String(extractedData.totalAmount) : '',
          taxAmount: extractedData?.taxAmount !== null && extractedData?.taxAmount !== undefined ? String(extractedData.taxAmount) : '',
          gstNumber: extractedData?.gstNumber || (vendorObj ? vendorObj.vendorGST : '')
        };
        setFields(formFields);
        setOriginalFields(formFields);
      } else {
        setError('Failed to load invoice review parameters.');
      }
    } catch (err) {
      console.error('Fetch invoice review data failed:', err);
      setError(err.message || 'Error loading invoice review data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData(true);
    }
  }, [invoiceId]);

  // Polling for extraction completion
  useEffect(() => {
    let interval;
    if (extractionStatus === 'Processing') {
      interval = setInterval(async () => {
        try {
          const response = await invoiceService.getReviewData(invoiceId);
          if (response?.status === 'success' && response.data) {
            const currentStatus = response.data.extractionStatus;
            if (currentStatus !== 'Processing' && currentStatus !== 'Pending') {
              clearInterval(interval);
              fetchInvoiceData(false);
            }
          }
        } catch (err) {
          console.error('Error polling invoice status:', err);
        }
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [extractionStatus, invoiceId]);

  // Verify mock PDF contents
  useEffect(() => {
    const isPdf = invoiceFileUrl.toLowerCase().endsWith('.pdf') || invoiceFileUrl.includes('raw');
    if (invoiceFileUrl && isPdf) {
      setPdfError(false);
      setMockPdfText('');
      fetch(invoiceFileUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch PDF content');
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
  }, [invoiceFileUrl]);

  // Authorization check
  const isAuthorized = user && ['Admin', 'Manager', 'AccountsExecutive'].includes(user.role);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.5));
  const handleZoomReset = () => setZoom(1.0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetField = (fieldName) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: originalFields[fieldName] || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError('You are not authorized to review invoices.');
      return;
    }
    
    setIsSaving(true);
    setError('');
    setSuccess('');

    const missing = [];
    const fieldMapping = {
      invoiceNumber: 'Invoice Number',
      poNumber: 'PO Number',
      invoiceDate: 'Invoice Date',
      totalAmount: 'Total Amount',
      gstNumber: 'GST Number'
    };

    if (!selectedVendorId) {
      missing.push('Vendor');
    }

    mandatoryFields.forEach(field => {
      const val = fields[field];
      if (val === null || val === undefined || String(val).trim() === '') {
        missing.push(fieldMapping[field] || field);
      }
    });

    if (missing.length > 0) {
      setError(`Missing Required Fields:\n${missing.map(f => `* ${f}`).join('\n')}`);
      setIsSaving(false);
      return;
    }
    
    try {
      const response = await invoiceService.submitReview(invoiceId, {
        invoiceNumber: fields.invoiceNumber,
        poNumber: fields.poNumber,
        vendorName: fields.vendorName,
        invoiceDate: fields.invoiceDate,
        totalAmount: fields.totalAmount !== '' ? parseFloat(fields.totalAmount) : null,
        taxAmount: fields.taxAmount !== '' ? parseFloat(fields.taxAmount) : null,
        gstNumber: fields.gstNumber,
        vendorId: selectedVendorId
      });

      if (response?.status === 'success') {
        // Redirect back to invoices list with success message
        navigate('/invoices', { 
          state: { 
            successMessage: `Invoice review completed successfully.` 
          } 
        });
      } else {
        setError(response.message || 'Failed to submit invoice review.');
        setIsSaving(false);
      }
    } catch (err) {
      console.error('Submit review error:', err);
      setError(err.message || 'Failed to submit invoice review.');
      setIsSaving(false);
    }
  };

  if (!isAuthorized && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md mx-auto my-12 text-center" id="access-denied-view">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Access Denied</h3>
        <p className="text-slate-500 text-sm mt-2">
          Your current security role ({user?.role || 'Guest'}) does not have permission to access the invoice validation and review tools.
        </p>
        <Link to="/invoices" className="mt-6 inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-sm transition-colors hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices</span>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[400px]">
        <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading invoice review interface...</span>
      </div>
    );
  }

  const isPdf = invoiceFileUrl.toLowerCase().endsWith('.pdf') || invoiceFileUrl.includes('raw');

  // Confidence highlights helper
  const getFieldHighlight = (fieldName) => {
    const score = confidenceScores[fieldName];
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

  const formattedReviewedDate = reviewedAt ? new Date(reviewedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '';

  const isMandatory = (fieldKey) => mandatoryFields.includes(fieldKey);

  return (
    <div className="space-y-6" id="invoice-review-page">
      {/* Top sticky navigation headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <Link 
            to="/invoices"
            className="inline-flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Cancel and return to list"
            id="review-back-link"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices / Review</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                reviewStatus === 'Reviewed' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-yellow-50 text-yellow-700 border-yellow-250'
              }`}>
                {reviewStatus === 'Reviewed' ? 'Reviewed' : 'Pending Review'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate max-w-lg mt-0.5">
              {fileName || 'Invoice Human Validation'}
            </h1>
          </div>
        </div>

        {/* Audit Trail Badge */}
        {reviewStatus === 'Reviewed' && (
          <div className="flex items-center space-x-2.5 bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-xs text-slate-600">
            <User className="h-4 w-4 text-slate-400" />
            <span>
              Reviewed by <span className="font-semibold">{reviewedBy ? `${reviewedBy.firstName} ${reviewedBy.lastName}` : 'System'}</span> on <span className="font-semibold">{formattedReviewedDate}</span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span style={{ whiteSpace: 'pre-wrap' }}>{error}</span>
        </div>
      )}

      {/* Main Two-Column Panel */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-20">
        
        {/* LEFT PANEL: Document Preview (Spans 7 columns on LG) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[700px]">
          {/* Zoom controls toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-1.5">
              <FileText className="h-4.5 w-4.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Invoice Preview</span>
            </div>
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 hover:bg-slate-50 rounded transition-colors"
                title="Zoom Out"
                id="zoom-out-btn"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-600 min-w-[3rem] text-center" id="zoom-percentage">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 hover:bg-slate-50 rounded transition-colors"
                title="Zoom In"
                id="zoom-in-btn"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="h-4 w-px bg-slate-200 my-0.5"></span>
              <button
                type="button"
                onClick={handleZoomReset}
                disabled={zoom === 1.0}
                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 hover:bg-slate-50 rounded transition-colors"
                title="Reset Zoom"
                id="zoom-reset-btn"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable embed viewer container */}
          <div className="flex-1 bg-slate-100 overflow-auto relative p-4 flex items-start justify-center">
            {invoiceFileUrl ? (
              <div 
                style={{ 
                  transform: `scale(${zoom})`, 
                  transformOrigin: 'top center',
                  transition: 'transform 0.1s ease-out',
                  width: isPdf ? '100%' : 'auto',
                  height: isPdf ? '620px' : 'auto'
                }}
                className="origin-top shadow-md bg-white rounded-lg overflow-hidden w-full h-full"
              >
                {mockPdfText ? (
                  <div className="p-8 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-200 h-full min-h-[620px] overflow-auto select-all leading-relaxed whitespace-pre-wrap text-left">
                    <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between font-sans">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Simulated PDF Preview (Mock Text File)</span>
                      <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold">Auto Fallback Preview</span>
                    </div>
                    {mockPdfText}
                  </div>
                ) : isPdf ? (
                  <iframe 
                    src={`${invoiceFileUrl}#toolbar=0`} 
                    className="w-full h-full border-0 min-h-[620px]" 
                    title="Invoice Document"
                    id="preview-pdf-frame"
                  />
                ) : (
                  <img 
                    src={invoiceFileUrl} 
                    alt="Invoice Preview" 
                    className="max-w-full max-h-[620px] object-contain"
                    id="preview-image-element"
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

        {/* RIGHT PANEL: Extracted fields validation (Spans 5 columns on LG) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[700px]">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Extracted OCR Fields</h2>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Info className="h-4 w-4 text-brand-500" />
              <span>Color shows confidence score</span>
            </div>
          </div>

          {isExtracting ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <Loader2 className="h-10 w-10 text-brand-600 animate-spin" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">Extracting Invoice Metadata</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Running PaddleOCR and LayoutLMv3 document intelligence pipeline. This will take just a few seconds...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Field: Matched Vendor */}
            <div className="space-y-1.5 pb-3 border-b border-slate-100">
              <label htmlFor="vendorId" className="block text-xs font-bold text-slate-700">
                Matched Vendor <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                id="vendorId"
                name="vendorId"
                required
                value={selectedVendorId}
                onChange={(e) => {
                  const vId = e.target.value;
                  setSelectedVendorId(vId);
                  const vObj = vendors.find(v => v._id === vId);
                  setMandatoryFields(vObj ? vObj.mandatoryFields : []);
                  setFields(prev => ({
                    ...prev,
                    vendorName: vObj ? vObj.vendorName : prev.vendorName,
                    gstNumber: vObj ? vObj.vendorGST : prev.gstNumber
                  }));
                }}
                className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold cursor-pointer"
              >
                <option value="">-- Match Business Vendor --</option>
                {vendors.map(v => (
                  <option key={v._id} value={v._id}>
                    {v.vendorName} ({v.vendorCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Field: Invoice Number */}
            {(() => {
              const highlight = getFieldHighlight('invoiceNumber');
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="invoiceNumber" className="font-bold text-slate-700">
                      Invoice Number {isMandatory('invoiceNumber') && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`} id="confidence-invoiceNumber">
                        OCR Confidence: {highlight.scoreText}
                      </span>
                      {fields.invoiceNumber !== originalFields.invoiceNumber && (
                        <button
                          type="button"
                          onClick={() => handleResetField('invoiceNumber')}
                          className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[10px] font-bold"
                          title="Revert to OCR value"
                        >
                          <CornerUpLeft className="h-3 w-3" />
                          <span>Revert</span>
                        </button>
                      )}
                      {highlight.isLow && (
                        <div className="relative group flex items-center">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500 cursor-help" />
                          <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                            Low confidence extraction. Please verify.
                            <span className="absolute top-full right-2 border-4 border-transparent border-t-slate-950"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    id="invoiceNumber"
                    name="invoiceNumber"
                    value={fields.invoiceNumber}
                    onChange={handleInputChange}
                    className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${highlight.inputClass}`}
                  />
                </div>
              );
            })()}

            {/* Field: PO Number */}
            {(() => {
              const highlight = getFieldHighlight('poNumber');
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="poNumber" className="font-bold text-slate-700">
                      PO Number {isMandatory('poNumber') && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`} id="confidence-poNumber">
                        OCR Confidence: {highlight.scoreText}
                      </span>
                      {fields.poNumber !== originalFields.poNumber && (
                        <button
                          type="button"
                          onClick={() => handleResetField('poNumber')}
                          className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[10px] font-bold"
                          title="Revert to OCR value"
                        >
                          <CornerUpLeft className="h-3 w-3" />
                          <span>Revert</span>
                        </button>
                      )}
                      {highlight.isLow && (
                        <div className="relative group flex items-center">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500 cursor-help" />
                          <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                            Low confidence extraction. Please verify.
                            <span className="absolute top-full right-2 border-4 border-transparent border-t-slate-950"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    id="poNumber"
                    name="poNumber"
                    value={fields.poNumber}
                    onChange={handleInputChange}
                    className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${highlight.inputClass}`}
                  />
                </div>
              );
            })()}

            {/* Field: Vendor Name */}
            {(() => {
              const highlight = getFieldHighlight('vendorName');
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="vendorName" className="font-bold text-slate-700">
                      Vendor Name {isMandatory('vendorName') && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`} id="confidence-vendorName">
                        OCR Confidence: {highlight.scoreText}
                      </span>
                      {fields.vendorName !== originalFields.vendorName && (
                        <button
                          type="button"
                          onClick={() => handleResetField('vendorName')}
                          className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[10px] font-bold"
                          title="Revert to OCR value"
                        >
                          <CornerUpLeft className="h-3 w-3" />
                          <span>Revert</span>
                        </button>
                      )}
                      {highlight.isLow && (
                        <div className="relative group flex items-center">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500 cursor-help" />
                          <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                            Low confidence extraction. Please verify.
                            <span className="absolute top-full right-2 border-4 border-transparent border-t-slate-950"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    id="vendorName"
                    name="vendorName"
                    value={fields.vendorName}
                    onChange={handleInputChange}
                    className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${highlight.inputClass}`}
                  />
                </div>
              );
            })()}

            {/* Field: Invoice Date */}
            {(() => {
              const highlight = getFieldHighlight('invoiceDate');
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="invoiceDate" className="font-bold text-slate-700">
                      Invoice Date {isMandatory('invoiceDate') && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`} id="confidence-invoiceDate">
                        OCR Confidence: {highlight.scoreText}
                      </span>
                      {fields.invoiceDate !== originalFields.invoiceDate && (
                        <button
                          type="button"
                          onClick={() => handleResetField('invoiceDate')}
                          className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[10px] font-bold"
                          title="Revert to OCR value"
                        >
                          <CornerUpLeft className="h-3 w-3" />
                          <span>Revert</span>
                        </button>
                      )}
                      {highlight.isLow && (
                        <div className="relative group flex items-center">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500 cursor-help" />
                          <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                            Low confidence extraction. Please verify.
                            <span className="absolute top-full right-2 border-4 border-transparent border-t-slate-950"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    id="invoiceDate"
                    name="invoiceDate"
                    value={fields.invoiceDate}
                    onChange={handleInputChange}
                    className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${highlight.inputClass}`}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              );
            })()}

            {/* Field: Total Amount */}
            {(() => {
              const highlight = getFieldHighlight('totalAmount');
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="totalAmount" className="font-bold text-slate-700">
                      Total Amount ($) {isMandatory('totalAmount') && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`} id="confidence-totalAmount">
                        OCR Confidence: {highlight.scoreText}
                      </span>
                      {fields.totalAmount !== originalFields.totalAmount && (
                        <button
                          type="button"
                          onClick={() => handleResetField('totalAmount')}
                          className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[10px] font-bold"
                          title="Revert to OCR value"
                        >
                          <CornerUpLeft className="h-3 w-3" />
                          <span>Revert</span>
                        </button>
                      )}
                      {highlight.isLow && (
                        <div className="relative group flex items-center">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500 cursor-help" />
                          <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                            Low confidence extraction. Please verify.
                            <span className="absolute top-full right-2 border-4 border-transparent border-t-slate-950"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    id="totalAmount"
                    name="totalAmount"
                    value={fields.totalAmount}
                    onChange={handleInputChange}
                    className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${highlight.inputClass}`}
                    placeholder="0.00"
                  />
                </div>
              );
            })()}

            {/* Field: Tax Amount */}
            {(() => {
              const highlight = getFieldHighlight('taxAmount');
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="taxAmount" className="font-bold text-slate-700">
                      Tax Amount ($) {isMandatory('taxAmount') && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`} id="confidence-taxAmount">
                        OCR Confidence: {highlight.scoreText}
                      </span>
                      {fields.taxAmount !== originalFields.taxAmount && (
                        <button
                          type="button"
                          onClick={() => handleResetField('taxAmount')}
                          className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[10px] font-bold"
                          title="Revert to OCR value"
                        >
                          <CornerUpLeft className="h-3 w-3" />
                          <span>Revert</span>
                        </button>
                      )}
                      {highlight.isLow && (
                        <div className="relative group flex items-center">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500 cursor-help" />
                          <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                            Low confidence extraction. Please verify.
                            <span className="absolute top-full right-2 border-4 border-transparent border-t-slate-950"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    id="taxAmount"
                    name="taxAmount"
                    value={fields.taxAmount}
                    onChange={handleInputChange}
                    className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${highlight.inputClass}`}
                    placeholder="0.00"
                  />
                </div>
              );
            })()}

            {/* Field: GST Number */}
            {(() => {
              const highlight = getFieldHighlight('gstNumber');
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="gstNumber" className="font-bold text-slate-700">
                      GST Number {isMandatory('gstNumber') && <span className="text-rose-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${highlight.badgeColor}`} id="confidence-gstNumber">
                        OCR Confidence: {highlight.scoreText}
                      </span>
                      {fields.gstNumber !== originalFields.gstNumber && (
                        <button
                          type="button"
                          onClick={() => handleResetField('gstNumber')}
                          className="text-brand-600 hover:text-brand-500 flex items-center space-x-0.5 text-[10px] font-bold"
                          title="Revert to OCR value"
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
                    value={fields.gstNumber}
                    onChange={handleInputChange}
                    className={`block w-full px-3.5 py-2.5 text-slate-800 text-sm font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all ${highlight.inputClass}`}
                    placeholder="e.g. 22AAAAA1111A1Z1"
                  />
                </div>
              );
            })()}

            </div>
          )}

          {/* Sticky footer action buttons */}
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 rounded-b-2xl">
            <Link
              to="/invoices"
              className="px-5 py-2.5 border border-slate-250 text-slate-550 rounded-xl text-sm font-semibold transition-colors hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving || isExtracting}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-85 text-white font-semibold text-sm transition-all shadow-md shadow-brand-600/10 active:scale-[0.98] rounded-xl"
              id="save-continue-btn"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  <span>Save & Continue</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default InvoiceReviewPage;
