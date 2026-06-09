import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import invoiceService from '../services/invoiceService';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Cpu, AlertCircle, Calendar, 
  User, Loader2, Download, CheckCircle2, ArrowRight
} from 'lucide-react';

const InvoiceDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const fetchInvoice = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await invoiceService.getInvoiceById(id);
      setInvoice(response.data);
      if (response.data?.extractionStatus !== 'Processing') {
        setIsExtracting(false);
      } else {
        setIsExtracting(true);
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError(err.message || 'Failed to retrieve invoice details.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchInvoice();
  }, [id]);

  // Polling loop when status is Processing
  useEffect(() => {
    let timer;
    if (invoice && invoice.extractionStatus === 'Processing') {
      timer = setInterval(() => {
        fetchInvoice(true);
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [invoice]);

  const handleExtract = async () => {
    setError('');
    setIsExtracting(true);
    try {
      await invoiceService.triggerExtraction(id);
      setInvoice(prev => ({ ...prev, extractionStatus: 'Processing' }));
    } catch (err) {
      console.error('Trigger extraction failed:', err);
      setError(err.message || 'Failed to trigger document intelligence OCR pipeline.');
      setIsExtracting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading invoice document details...</span>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm" id="error-alert">
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
        <span>{error}</span>
      </div>
    );
  }

  const isPdf = invoice.invoiceFileUrl.toLowerCase().endsWith('.pdf') || invoice.invoiceFileUrl.includes('raw');
  const formattedDate = new Date(invoice.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const extractionColors = {
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Processing: 'bg-indigo-50 text-indigo-750 border-indigo-200',
    Completed: 'bg-emerald-50 text-emerald-755 border-emerald-250',
    Failed: 'bg-rose-50 text-rose-750 border-rose-250'
  };

  const matchingColors = {
    NotMatched: 'bg-slate-50 text-slate-600 border-slate-200',
    Matched: 'bg-emerald-50 text-emerald-700 border-emerald-250',
    Mismatch: 'bg-orange-50 text-orange-700 border-orange-250'
  };

  const getConfidenceColor = (score) => {
    if (score === null || score === undefined) return 'text-slate-400';
    if (score >= 90) return 'text-emerald-600 font-bold';
    if (score >= 70) return 'text-yellow-600 font-semibold';
    return 'text-rose-600 font-semibold';
  };

  return (
    <div className="space-y-6" id="invoice-details-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link 
            to="/invoices"
            className="inline-flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            id="back-list-link"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices / Details</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate max-w-lg">{invoice.originalFileName}</h1>
          </div>
        </div>
        
        {/* Actions panel */}
        <div className="flex items-center space-x-2">
          <a
            href={invoice.invoiceFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-4.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            <Download className="h-4.5 w-4.5" />
            <span>Open Document</span>
          </a>
          
          {invoice.extractionStatus !== 'Processing' && (
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-85 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98]"
              id="extract-invoice-btn"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Cpu className="h-4.5 w-4.5" />
                  <span>Run OCR & Extract</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {invoice.extractionStatus === 'Completed' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in shadow-sm" id="extraction-complete-alert">
          <div className="flex items-start space-x-3 text-sm">
            <CheckCircle2 className="h-5.5 w-5.5 shrink-0 text-emerald-500 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-950 text-base">Text Extraction Complete!</h4>
              <p className="text-emerald-700 text-sm mt-0.5">The OCR pipeline has finished extracting raw data from the invoice. It is now awaiting human review and validation in the Validation queue.</p>
            </div>
          </div>
          <Link
            to={`/validation/${id}`}
            className="shrink-0 inline-flex items-center space-x-2 px-4.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/10 active:scale-[0.98]"
            id="review-now-btn"
          >
            <span>Review & Validate</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Document Viewer Frame */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Document Preview</h2>
          {isPdf ? (
            <iframe 
              src={`${invoice.invoiceFileUrl}#toolbar=0`} 
              className="w-full h-[600px] rounded-xl border border-slate-100" 
              title="Invoice File PDF"
              id="pdf-preview-iframe"
            />
          ) : (
            <div className="w-full h-[600px] flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden p-2">
              <img 
                src={invoice.invoiceFileUrl} 
                alt="Invoice File Preview"
                className="max-w-full max-h-full object-contain rounded-lg"
                id="image-preview-element"
              />
            </div>
          )}
        </div>

        {/* Extraction Information Card */}
        <div className="space-y-6">
          {/* Metadata summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Status Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-1.5">Extraction Status</span>
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${extractionColors[invoice.extractionStatus] || 'bg-slate-100'}`} id="extraction-status-badge">
                  {invoice.extractionStatus}
                </span>
                {invoice.extractionStatus === 'Processing' && (
                  <div className="flex items-center space-x-1.5 mt-2 text-xs text-indigo-650 font-semibold">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Processing in background...</span>
                  </div>
                )}
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 mb-1.5">Matching Status</span>
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${matchingColors[invoice.matchingStatus] || 'bg-slate-100'}`}>
                  {invoice.matchingStatus}
                </span>
              </div>
              <div className="border-t border-slate-50 pt-3 col-span-2 grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Uploaded By: <span className="font-semibold text-slate-700">{invoice.uploadedBy ? `${invoice.uploadedBy.firstName} ${invoice.uploadedBy.lastName}` : '-'}</span></span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Uploaded At: <span className="font-semibold text-slate-700">{formattedDate}</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Data Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Extracted Ingestion Parameters</h2>
            
            {invoice.extractionStatus === 'Pending' ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <Cpu className="h-8 w-8 text-slate-300 mx-auto mb-2.5" />
                <h4 className="font-bold text-slate-800 text-sm">Extraction Not Triggered</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Run the OCR Document Intelligence pipeline to extract structural fields automatically.
                </p>
              </div>
            ) : invoice.extractionStatus === 'Processing' ? (
              <div className="p-8 text-center border border-slate-100 rounded-2xl bg-indigo-50/20">
                <Loader2 className="h-8 w-8 text-brand-500 animate-spin mx-auto mb-2.5" />
                <h4 className="font-bold text-brand-800 text-sm">Analyzing Invoice Layout...</h4>
                <p className="text-xs text-indigo-400 mt-1 max-w-xs mx-auto">
                  Running PaddleOCR text detection and LayoutLMv3 semantic classification on the document.
                </p>
              </div>
            ) : invoice.extractionStatus === 'Failed' ? (
              <div className="p-8 text-center border-2 border-rose-100 rounded-2xl bg-rose-50/20">
                <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2.5" />
                <h4 className="font-bold text-rose-800 text-sm">Extraction Pipeline Failed</h4>
                <p className="text-xs text-rose-400 mt-1 max-w-xs mx-auto">
                  Verify that the document is not corrupted and is a supported PDF/Image format before retrying.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-inner bg-slate-50/30">
                {/* Invoice Number */}
                <div className="grid grid-cols-3 p-3 text-sm items-center hover:bg-slate-50/60 transition-colors">
                  <span className="font-medium text-slate-500">Invoice Number</span>
                  <span className="font-semibold text-slate-800 truncate px-2" id="extracted-invoice-number">
                    {invoice.extractedData?.invoiceNumber || <span className="text-slate-300 italic font-normal">Not Found</span>}
                  </span>
                  <span className="text-right text-xs">
                    <span className="text-slate-400 uppercase font-semibold">Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidenceScores?.invoiceNumber)}>
                      {invoice.confidenceScores?.invoiceNumber !== null ? `${invoice.confidenceScores.invoiceNumber}%` : '-'}
                    </span>
                  </span>
                </div>

                {/* PO Reference */}
                <div className="grid grid-cols-3 p-3 text-sm items-center hover:bg-slate-50/60 transition-colors">
                  <span className="font-medium text-slate-500">PO Reference</span>
                  <span className="font-semibold text-slate-800 truncate px-2" id="extracted-po-number">
                    {invoice.extractedData?.poNumber || <span className="text-slate-300 italic font-normal">Not Found</span>}
                  </span>
                  <span className="text-right text-xs">
                    <span className="text-slate-400 uppercase font-semibold">Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidenceScores?.poNumber)}>
                      {invoice.confidenceScores?.poNumber !== null ? `${invoice.confidenceScores.poNumber}%` : '-'}
                    </span>
                  </span>
                </div>

                {/* Vendor Name */}
                <div className="grid grid-cols-3 p-3 text-sm items-center hover:bg-slate-50/60 transition-colors">
                  <span className="font-medium text-slate-500">Vendor Name</span>
                  <span className="font-semibold text-slate-800 truncate px-2" id="extracted-vendor-name">
                    {invoice.extractedData?.vendorName || <span className="text-slate-300 italic font-normal">Not Found</span>}
                  </span>
                  <span className="text-right text-xs">
                    <span className="text-slate-400 uppercase font-semibold">Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidenceScores?.vendorName)}>
                      {invoice.confidenceScores?.vendorName !== null ? `${invoice.confidenceScores.vendorName}%` : '-'}
                    </span>
                  </span>
                </div>

                {/* Invoice Date */}
                <div className="grid grid-cols-3 p-3 text-sm items-center hover:bg-slate-50/60 transition-colors">
                  <span className="font-medium text-slate-500">Invoice Date</span>
                  <span className="font-semibold text-slate-800 truncate px-2" id="extracted-invoice-date">
                    {invoice.extractedData?.invoiceDate || <span className="text-slate-300 italic font-normal">Not Found</span>}
                  </span>
                  <span className="text-right text-xs">
                    <span className="text-slate-400 uppercase font-semibold">Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidenceScores?.invoiceDate)}>
                      {invoice.confidenceScores?.invoiceDate !== null ? `${invoice.confidenceScores.invoiceDate}%` : '-'}
                    </span>
                  </span>
                </div>

                {/* Total Amount */}
                <div className="grid grid-cols-3 p-3 text-sm items-center hover:bg-slate-50/60 transition-colors">
                  <span className="font-medium text-slate-500">Total Amount</span>
                  <span className="font-bold text-slate-800 truncate px-2" id="extracted-total-amount">
                    {invoice.extractedData?.totalAmount ? `$${parseFloat(invoice.extractedData.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : <span className="text-slate-300 italic font-normal">Not Found</span>}
                  </span>
                  <span className="text-right text-xs">
                    <span className="text-slate-400 uppercase font-semibold">Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidenceScores?.totalAmount)}>
                      {invoice.confidenceScores?.totalAmount !== null ? `${invoice.confidenceScores.totalAmount}%` : '-'}
                    </span>
                  </span>
                </div>

                {/* Tax Amount */}
                <div className="grid grid-cols-3 p-3 text-sm items-center hover:bg-slate-50/60 transition-colors">
                  <span className="font-medium text-slate-500">Tax Amount</span>
                  <span className="font-semibold text-slate-800 truncate px-2" id="extracted-tax-amount">
                    {invoice.extractedData?.taxAmount ? `$${parseFloat(invoice.extractedData.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : <span className="text-slate-300 italic font-normal">Not Found</span>}
                  </span>
                  <span className="text-right text-xs">
                    <span className="text-slate-400 uppercase font-semibold">Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidenceScores?.taxAmount)}>
                      {invoice.confidenceScores?.taxAmount !== null ? `${invoice.confidenceScores.taxAmount}%` : '-'}
                    </span>
                  </span>
                </div>

                {/* GST Number */}
                <div className="grid grid-cols-3 p-3 text-sm items-center hover:bg-slate-50/60 transition-colors">
                  <span className="font-medium text-slate-500">GST Number</span>
                  <span className="font-semibold text-slate-800 truncate px-2" id="extracted-gst-number">
                    {invoice.extractedData?.gstNumber || <span className="text-slate-300 italic font-normal">Not Found</span>}
                  </span>
                  <span className="text-right text-xs">
                    <span className="text-slate-400 uppercase font-semibold">Confidence: </span>
                    <span className={getConfidenceColor(invoice.confidenceScores?.gstNumber)}>
                      {invoice.confidenceScores?.gstNumber !== null ? `${invoice.confidenceScores.gstNumber}%` : '-'}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsPage;
