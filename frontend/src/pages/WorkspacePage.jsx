import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Cpu, AlertCircle, Calendar, User, Loader2, Download, CheckCircle2,
  AlertTriangle, Receipt, Building, FileSpreadsheet, CreditCard, History, Info
} from 'lucide-react';
import invoiceService from '../services/invoiceService';
import { apiClient } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import ActivityTimeline from '../components/ActivityTimeline';

const WorkspacePage = () => {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  
  const [invoice, setInvoice] = useState(null);
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const fetchWorkspaceData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch invoice details
      const invResponse = await invoiceService.getInvoiceById(invoiceId);
      setInvoice(invResponse.data);

      // Fetch payment record details
      const payResponse = await apiClient.get(`/payments?invoiceId=${invoiceId}`);
      if (payResponse.data?.data && payResponse.data.data.length > 0) {
        setPayment(payResponse.data.data[0]);
      } else {
        setPayment(null);
      }
    } catch (err) {
      console.error('Workspace data load failed:', err);
      setError(err.message || 'Failed to retrieve workspace data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [invoiceId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <Loader2 className="h-10 w-10 text-brand-605 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading document workspace...</span>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-805 p-4 rounded-xl flex items-start space-x-3 text-sm" id="error-alert">
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
        <span>{error}</span>
      </div>
    );
  }

  const isPdf = invoice.invoiceFileUrl.toLowerCase().endsWith('.pdf') || invoice.invoiceFileUrl.includes('raw');
  const formattedDate = new Date(invoice.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getConfidenceColor = (score) => {
    if (score === null || score === undefined) return 'text-slate-450';
    if (score >= 90) return 'text-emerald-600 font-bold';
    if (score >= 70) return 'text-yellow-605 font-semibold';
    return 'text-rose-600 font-semibold';
  };

  return (
    <div className="space-y-6" id="workspace-view">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link 
            to="/invoices"
            className="inline-flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            id="back-workspace-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-[10px] font-extrabold text-brand-650 uppercase tracking-widest bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full">Document Workspace</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 truncate max-w-lg">{invoice.originalFileName}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={invoice.invoiceFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-4.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-750 font-semibold text-sm transition-colors"
          >
            <Download className="h-4.5 w-4.5" />
            <span>Download Source</span>
          </a>
        </div>
      </div>

      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Preview (Sticky) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoice Document Preview</span>
            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 font-semibold font-mono">
              {isPdf ? 'PDF Frame' : 'Image Reader'}
            </span>
          </div>
          {isPdf ? (
            <iframe 
              src={`${invoice.invoiceFileUrl}#toolbar=0`} 
              className="w-full h-[600px] rounded-xl border border-slate-100" 
              title="Invoice PDF"
            />
          ) : (
            <div className="w-full h-[600px] flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden p-2">
              <img 
                src={invoice.invoiceFileUrl} 
                alt="Invoice Preview"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Right Column: Sections Accordion / Cards */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Validation & Workflow State */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Info className="h-4.5 w-4.5 text-indigo-500" />
              <span>Validation & Workflow State</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
              <div>
                <span className="block text-slate-400 mb-1">Invoice Status</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full border bg-brand-50 text-brand-700 border-brand-200 font-bold">
                  {invoice.currentStatus}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 mb-1">Validation Status</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200 font-bold">
                  {invoice.validationStatus}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 mb-1">OCR Status</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full border bg-indigo-55/10 text-indigo-705 border-indigo-200 font-bold">
                  {invoice.extractionStatus}
                </span>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-500 space-y-1">
              <div>Uploaded By: <span className="font-bold text-slate-800">{invoice.uploadedBy ? `${invoice.uploadedBy.firstName} ${invoice.uploadedBy.lastName}` : 'System'}</span></div>
              <div>Uploaded On: <span className="font-bold text-slate-800">{formattedDate}</span></div>
            </div>
          </div>

          {/* Section 2: OCR Extracted Fields */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Receipt className="h-4.5 w-4.5 text-brand-650" />
              <span>OCR Extraction Results</span>
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
              {[
                { label: 'Invoice Number', val: invoice.extractedData?.invoiceNumber, score: invoice.confidenceScores?.invoiceNumber },
                { label: 'PO Number Reference', val: invoice.extractedData?.poNumber, score: invoice.confidenceScores?.poNumber },
                { label: 'Vendor Name Invoiced', val: invoice.extractedData?.vendorName, score: invoice.confidenceScores?.vendorName },
                { label: 'Invoice Date', val: invoice.extractedData?.invoiceDate, score: invoice.confidenceScores?.invoiceDate },
                { label: 'Total Invoiced Amount', val: invoice.extractedData?.totalAmount ? formatCurrency(parseFloat(invoice.extractedData.totalAmount)) : null, score: invoice.confidenceScores?.totalAmount },
                { label: 'Tax Amount Included', val: invoice.extractedData?.taxAmount ? formatCurrency(parseFloat(invoice.extractedData.taxAmount)) : null, score: invoice.confidenceScores?.taxAmount },
                { label: 'GSTIN Registration', val: invoice.extractedData?.gstNumber, score: invoice.confidenceScores?.gstNumber }
              ].map((field, idx) => (
                <div key={idx} className="grid grid-cols-3 p-3 text-xs items-center hover:bg-slate-50/50 transition-colors">
                  <span className="font-bold text-slate-500">{field.label}</span>
                  <span className="font-extrabold text-slate-850 truncate px-2">
                    {field.val || <span className="text-slate-350 italic font-normal">Not Ingested</span>}
                  </span>
                  <span className="text-right">
                    {field.score !== undefined && field.score !== null ? (
                      <>
                        <span className="text-slate-400 font-semibold uppercase text-[10px]">Confidence: </span>
                        <span className={getConfidenceColor(field.score)}>{field.score}%</span>
                      </>
                    ) : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Vendor Matching Profile */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Building className="h-4.5 w-4.5 text-emerald-600" />
              <span>Vendor Match Details</span>
            </h3>
            {invoice.matchedVendor ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-550 bg-emerald-50/15 border border-emerald-100 p-4.5 rounded-xl">
                <div>Vendor Code: <span className="font-extrabold text-slate-800">{invoice.matchedVendor.vendorCode}</span></div>
                <div>Vendor Name: <span className="font-extrabold text-slate-800">{invoice.matchedVendor.vendorName}</span></div>
                <div>Vendor Email: <span className="font-medium text-slate-800">{invoice.matchedVendor.vendorEmail}</span></div>
                <div>Vendor GSTIN: <span className="font-mono text-slate-800">{invoice.matchedVendor.vendorGST}</span></div>
                <div className="md:col-span-2">Address: <span className="font-medium text-slate-800">{invoice.matchedVendor.vendorAddress || '-'}</span></div>
              </div>
            ) : (
              <div className="p-5 text-center bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400">
                No matching vendor profile linked.
              </div>
            )}
          </div>

          {/* Section 4: PO Agreement Profile */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <FileSpreadsheet className="h-4.5 w-4.5 text-blue-500" />
              <span>PO Match Details</span>
            </h3>
            {invoice.matchedPO ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-550 bg-blue-50/15 border border-blue-105 p-4.5 rounded-xl">
                <div>PO Number: <span className="font-mono font-extrabold text-slate-800">{invoice.matchedPO.poNumber}</span></div>
                <div>PO Date: <span className="font-bold text-slate-800">{new Date(invoice.matchedPO.poDate).toLocaleDateString()}</span></div>
                <div>Total Contract Value: <span className="font-extrabold text-slate-800">{formatCurrency(invoice.matchedPO.totalAmount)}</span></div>
                <div>PO Status: <span className="inline-block px-2 py-0.5 rounded-md bg-white border font-bold text-blue-600">{invoice.matchedPO.status}</span></div>
              </div>
            ) : (
              <div className="p-5 text-center bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400">
                No matching Purchase Order linked.
              </div>
            )}
          </div>

          {/* Section 5: Payment workbench Settlement */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <CreditCard className="h-4.5 w-4.5 text-purple-650" />
              <span>Payment & Settlement Workbench</span>
            </h3>
            {payment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-555 bg-purple-50/15 border border-purple-105 p-4.5 rounded-xl">
                <div>Payment Status: 
                  <span className={`ml-2 inline-block px-2.5 py-0.5 rounded-full border font-bold ${
                    payment.paymentStatus === 'Paid' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : payment.paymentStatus === 'OnHold' 
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {payment.paymentStatus}
                  </span>
                </div>
                <div>Disbursement Amount: <span className="font-extrabold text-slate-800">{formatCurrency(payment.amount)}</span></div>
                {payment.paymentDate && <div>Settlement Date: <span className="font-bold text-slate-800">{new Date(payment.paymentDate).toLocaleString()}</span></div>}
                {payment.paymentReference && <div>Reference TXN ID: <span className="font-mono font-extrabold text-slate-850">{payment.paymentReference}</span></div>}
                {payment.notes && <div className="md:col-span-2">Settlement Remarks: <span className="font-medium text-slate-600 italic">"{payment.notes}"</span></div>}
              </div>
            ) : (
              <div className="p-5 text-center bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400">
                Awaiting payment record (Disbursements are unlocked once the document workflow reaches Validated state).
              </div>
            )}
          </div>

          {/* Section 6: Audit Activities timeline */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-2">
              <History className="h-4.5 w-4.5 text-slate-500" />
              <span>Audit Trail History</span>
            </h3>
            <div className="px-1 py-1">
              <ActivityTimeline invoiceId={invoiceId} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;
