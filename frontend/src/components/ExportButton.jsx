import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Table } from 'lucide-react';

const ExportButton = ({ 
  data = [], 
  headers = [], 
  filename = 'export' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerCSVDownload = (csvContent, fileExt = 'csv') => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${Date.now()}.${fileExt}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCleanedValue = (row, key) => {
    // Access nested fields e.g., 'extractedData.invoiceNumber'
    const value = key.split('.').reduce((acc, part) => acc?.[part], row);
    if (value === null || value === undefined) return '';
    
    // Clean string values
    return String(value).replace(/"/g, '""');
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    
    const headerRow = headers.map(h => `"${h.label}"`).join(',');
    const dataRows = data.map(row => 
      headers.map(h => `"${getCleanedValue(row, h.key)}"`).join(',')
    );

    const csvContent = [headerRow, ...dataRows].join('\n');
    triggerCSVDownload(csvContent, 'csv');
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    // For Excel, we download as a CSV with a BOM (Byte Order Mark) to ensure Excel parses utf-8 encoding properly.
    if (data.length === 0) return;

    const BOM = '\uFEFF';
    const headerRow = headers.map(h => `"${h.label}"`).join(',');
    const dataRows = data.map(row => 
      headers.map(h => `"${getCleanedValue(row, h.key)}"`).join(',')
    );

    const csvContent = BOM + [headerRow, ...dataRows].join('\n');
    triggerCSVDownload(csvContent, 'csv'); // CSV is the standard compatible file format for Excel imports
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="export-dropdown-container">
      <div className="inline-flex rounded-xl shadow-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={data.length === 0}
          className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>Export Data</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-250 shadow-xl py-1 z-50 animate-fade-in">
          <button
            onClick={handleExportCSV}
            className="w-full text-left flex items-center space-x-2.5 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-indigo-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="w-full text-left flex items-center space-x-2.5 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Table className="h-4 w-4 text-emerald-500" />
            <span>Export Excel</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
