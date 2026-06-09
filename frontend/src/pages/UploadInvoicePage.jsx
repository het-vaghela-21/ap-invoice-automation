import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import invoiceService from '../services/invoiceService';
import { ArrowLeft, Upload, AlertCircle, Loader2, Paperclip } from 'lucide-react';

const UploadInvoicePage = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      setSelectedFile(null);
      return;
    }

    // Check file format
    const allowedExtensions = /\.(pdf|png|jpg|jpeg)$/i;
    if (!allowedExtensions.test(file.name)) {
      setError('Invalid file format. Only PDF, PNG, JPG, and JPEG files are allowed.');
      setSelectedFile(null);
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedFile) {
      setError('Please select an invoice file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      await invoiceService.uploadInvoice(selectedFile);
      navigate('/invoices');
    } catch (err) {
      console.error('Upload invoice error:', err);
      if (err.errors && err.errors.length > 0) {
        setError(err.errors[0].msg);
      } else {
        setError(err.message || 'Failed to upload invoice document.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6" id="upload-invoice-page">
      {/* Top Breadcrumb */}
      <div className="flex items-center space-x-2.5">
        <Link 
          to="/invoices"
          className="inline-flex p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          id="back-list-link"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Invoice</h1>
        </div>
      </div>

      {/* Warning/Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Ingestion Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6 max-w-2xl">
        <div className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Invoice Document File
          </label>
          
          <div className="border-2 border-dashed border-slate-200 hover:border-brand-500/80 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50/50 transition-colors relative">
            <input
              type="file"
              id="invoiceFile"
              name="invoiceFile"
              accept=".pdf,.png,.jpg,.jpeg"
              required
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {selectedFile ? (
              <div className="flex flex-col items-center animate-fade-in text-center">
                <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-2xl text-brand-600 mb-3">
                  <Paperclip className="h-9 w-9" />
                </div>
                <span className="text-sm font-semibold text-slate-800">{selectedFile.name}</span>
                <span className="text-xs text-slate-400 mt-1">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; {selectedFile.type}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <Upload className="h-11 w-11 text-slate-400 mb-3" />
                <span className="text-sm font-semibold text-slate-700">Click or Drag invoice document here</span>
                <span className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPEG, JPG up to 10MB</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
          <Link
            to="/invoices"
            className="px-5 py-3 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98] disabled:opacity-85"
            id="submit-upload-btn"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4.5 w-4.5" />
                <span>Upload Document</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadInvoicePage;
