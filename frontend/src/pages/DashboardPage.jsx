import React from 'react';
import { 
  FileText, Upload, TrendingUp, Clock, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight
} from 'lucide-react';

const DashboardPage = () => {
  // Static placeholders for aesthetic demonstration
  const stats = [
    { name: 'Total Invoices', value: '148', icon: FileText, change: '+12%', changeType: 'positive', color: 'text-brand-600 bg-brand-50' },
    { name: 'Processing (OCR)', value: '12', icon: Clock, change: 'Running', changeType: 'neutral', color: 'text-amber-600 bg-amber-50' },
    { name: 'Auto-Matched', value: '84%', icon: TrendingUp, change: '+4%', changeType: 'positive', color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Pending Approval', value: '23', icon: AlertCircle, change: 'Requires Action', changeType: 'negative', color: 'text-rose-600 bg-rose-50' },
  ];

  const recentInvoices = [
    { id: 'INV-2026-001', vendor: 'Acme Corp Solutions', date: 'Jun 4, 2026', amount: '$4,250.00', status: 'Approved', statusColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'INV-2026-002', vendor: 'Globex Logistics LLC', date: 'Jun 3, 2026', amount: '$1,890.50', status: 'Matching', statusColor: 'bg-blue-100 text-blue-800' },
    { id: 'INV-2026-003', vendor: 'Initech Consulting', date: 'Jun 2, 2026', amount: '$12,400.00', status: 'OCR Processing', statusColor: 'bg-amber-100 text-amber-800' },
    { id: 'INV-2026-004', vendor: 'Umbrella Corporation', date: 'May 31, 2026', amount: '$850.00', status: 'Pending Review', statusColor: 'bg-rose-100 text-rose-800' },
  ];

  return (
    <div className="space-y-8" id="dashboard-page">
      {/* Welcome & Info Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back. Here is an overview of your accounts payable pipelines.</p>
        </div>
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-500">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span>System Foundation Active</span>
        </div>
      </div>

      {/* Info Alert explaining the foundation */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 flex items-start space-x-4">
        <div className="p-2 bg-brand-100 text-brand-700 rounded-xl">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-bold text-brand-900 text-base">AP Invoice Automation Architecture Installed</h3>
          <p className="text-brand-800 text-sm mt-1 leading-relaxed">
            This is the production-ready boilerplate setup. The UI displays interactive mockup states. 
            Backend endpoints are configured with CORS, Express error boundaries, logging, and health checking. 
            The Python ML service template is configured for future OCR and matching models.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.name}</span>
              <div className="text-3xl font-extrabold text-slate-900">{stat.value}</div>
              <div className="flex items-center space-x-1.5">
                <span className={`text-xs font-bold ${
                  stat.changeType === 'positive' ? 'text-emerald-600' : 
                  stat.changeType === 'negative' ? 'text-rose-600' : 'text-slate-500'
                }`}>{stat.change}</span>
                <span className="text-[10px] text-slate-400">vs last month</span>
              </div>
            </div>
            <div className={`p-4 rounded-2xl ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Workspaces Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Panel (Placeholder) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Invoices</h2>
            <p className="text-xs text-slate-500 mt-1">Upload PDF, PNG, or JPG invoices for AI ingestion.</p>
            
            {/* Upload Area Visualizer */}
            <div className="mt-6 border-2 border-dashed border-slate-200 hover:border-brand-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
              <Upload className="h-10 w-10 text-slate-400 mb-3" />
              <span className="text-sm font-semibold text-slate-700">Drag & drop invoice files here</span>
              <span className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPEG up to 10MB</span>
              <button className="mt-4 px-4 py-2 text-xs font-bold text-brand-600 bg-brand-50 border border-brand-100 rounded-lg hover:bg-brand-100 transition-colors">
                Browse Files
              </button>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>OCR Queue: Idle</span>
            <span className="font-semibold text-brand-600">Config: Local ML-Service</span>
          </div>
        </div>

        {/* Recent Invoices Table (Placeholder) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Invoice Queue</h2>
                <p className="text-xs text-slate-500 mt-1">Status of recently processed and matching documents.</p>
              </div>
              <button className="text-xs font-bold text-brand-600 hover:text-brand-500 flex items-center space-x-1">
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    <th className="pb-3">Invoice ID</th>
                    <th className="pb-3">Vendor</th>
                    <th className="pb-3">Ingested Date</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="group hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 font-semibold text-brand-600">{inv.id}</td>
                      <td className="py-3.5 text-slate-800 font-medium">{inv.vendor}</td>
                      <td className="py-3.5 text-slate-400 text-xs">{inv.date}</td>
                      <td className="py-3.5 font-semibold text-slate-800">{inv.amount}</td>
                      <td className="py-3.5 text-right">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${inv.statusColor}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
            <span>Showing 4 entries</span>
            <span className="flex items-center space-x-1 cursor-pointer hover:text-slate-600">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
