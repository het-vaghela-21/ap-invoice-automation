import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, FileSpreadsheet, Receipt, Clock, CheckCircle2, CreditCard, AlertTriangle,
  RefreshCw, UserPlus, UploadCloud, AlertOctagon, HelpCircle, ArrowRight, ShieldAlert,
  Calendar, User, ChevronRight, DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import dashboardService from '../services/dashboardService';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time fetched state
  const [summary, setSummary] = useState(null);
  const [invoiceStatusData, setInvoiceStatusData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [exceptionData, setExceptionData] = useState([]);
  const [poData, setPoData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [readyForPayment, setReadyForPayment] = useState([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        summaryRes,
        statusRes,
        vendorsRes,
        exceptionsRes,
        poRes,
        activityRes,
        readyRes
      ] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getInvoiceStatus(),
        dashboardService.getVendors(),
        dashboardService.getExceptions(),
        dashboardService.getPurchaseOrders(),
        dashboardService.getRecentActivity(),
        dashboardService.getReadyForPayment()
      ]);

      setSummary(summaryRes.data);
      setInvoiceStatusData(statusRes.data);
      setVendorData(vendorsRes.data);
      setExceptionData(exceptionsRes.data);
      setPoData(poRes.data);
      setRecentActivity(activityRes.data);
      setReadyForPayment(readyRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load real-time operational dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format date-time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Chart Color Schemes
  const INVOICE_STATUS_COLORS = {
    Uploaded: '#6366f1',      // indigo
    Extracted: '#0ea5e9',     // sky
    UnderReview: '#f59e0b',   // amber
    Validated: '#10b981',     // emerald
    ReadyForPayment: '#8b5cf6', // purple
    Exception: '#ef4444'      // red
  };

  const PO_STATUS_COLORS = {
    Draft: '#94a3b8',         // slate
    Open: '#3b82f6',          // blue
    Closed: '#10b981',        // emerald
    Cancelled: '#ef4444'      // red
  };

  if (error) {
    return (
      <div className="space-y-6" id="dashboard-error-view">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Operational view of Accounts Payable metrics.</p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-250 rounded-2xl p-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-12 animate-fade-in shadow-sm">
          <div className="p-4 bg-rose-100 text-rose-600 rounded-full mb-4">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h3 className="font-bold text-rose-900 text-lg">Failed to Synchronize Dashboard</h3>
          <p className="text-rose-800 text-sm mt-2 leading-relaxed max-w-md">
            {error}
          </p>
          <button
            onClick={fetchDashboardData}
            className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-rose-600/15"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  // Quick Action Buttons definitions
  const quickActions = [
    {
      label: 'Create Vendor',
      icon: UserPlus,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      action: () => navigate('/vendors?create=true')
    },
    {
      label: 'Create Purchase Order',
      icon: FileSpreadsheet,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      action: () => navigate('/purchase-orders/create')
    },
    {
      label: 'Upload Invoice',
      icon: UploadCloud,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      action: () => navigate('/invoices/upload')
    },
    {
      label: 'View Exceptions',
      icon: AlertOctagon,
      color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      action: () => navigate('/exceptions')
    }
  ];

  return (
    <div className="space-y-8" id="dashboard-page">
      {/* Top Welcome / Info Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Operational Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time oversight into invoice workflows, validation anomalies, and vendor accounts.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="inline-flex items-center justify-center p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all shadow-sm disabled:opacity-50"
            title="Refresh dashboard stats"
            id="refresh-dashboard-btn"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-500">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Live Sync Active</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Workflows</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              disabled={isLoading}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left font-semibold text-sm ${item.color} active:scale-[0.99] disabled:opacity-60`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="h-4.5 w-4.5 opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-3">
              <div className="h-3 w-2/5 bg-slate-200 rounded"></div>
              <div className="h-8 w-3/5 bg-slate-300 rounded"></div>
              <div className="h-2 w-4/5 bg-slate-100 rounded"></div>
            </div>
          ))
        ) : (
          <>
            {/* Total Vendors */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Vendors</span>
                <div className="text-3xl font-extrabold text-slate-900">{summary?.totalVendors || 0}</div>
                <div className="text-[11px] text-slate-400">Registered business suppliers</div>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Building className="h-6 w-6" />
              </div>
            </div>

            {/* Total Purchase Orders */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Orders</span>
                <div className="text-3xl font-extrabold text-slate-900">{summary?.totalPurchaseOrders || 0}</div>
                <div className="text-[11px] text-slate-400">Total ingested PO agreements</div>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
            </div>

            {/* Total Invoices */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoices</span>
                <div className="text-3xl font-extrabold text-slate-900">{summary?.totalInvoices || 0}</div>
                <div className="text-[11px] text-slate-400">Invoiced documents ingested</div>
              </div>
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Receipt className="h-6 w-6" />
              </div>
            </div>

            {/* Invoices Under Review */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Under Review</span>
                <div className="text-3xl font-extrabold text-slate-900">{summary?.invoicesUnderReview || 0}</div>
                <div className="text-[11px] text-slate-400">Pending OCR/matching review</div>
              </div>
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {/* Validated Invoices */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Validated Invoices</span>
                <div className="text-3xl font-extrabold text-slate-900">{summary?.validatedInvoices || 0}</div>
                <div className="text-[11px] text-slate-400">Validation engine criteria cleared</div>
              </div>
              <div className="p-3.5 bg-teal-50 text-teal-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            {/* Ready For Payment */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready For Payment</span>
                <div className="text-3xl font-extrabold text-slate-900">{summary?.readyForPayment || 0}</div>
                <div className="text-[11px] text-slate-400">Awaiting disbursement run</div>
              </div>
              <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>

            {/* Exception Invoices */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exceptions</span>
                <div className="text-3xl font-extrabold text-slate-900">{summary?.exceptionInvoices || 0}</div>
                <div className="text-[11px] text-slate-400">Blocked due to compliance flags</div>
              </div>
              <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analytics Visualizations (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invoice Status Distribution (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invoices by Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">Proportional status overview across ingested documents.</p>
          </div>
          <div className="flex-1 mt-6 flex flex-col sm:flex-row items-center justify-between">
            {isLoading ? (
              <div className="w-full h-52 bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading status breakdown...</div>
            ) : invoiceStatusData.every(item => item.count === 0) ? (
              <div className="w-full h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Receipt className="h-8 w-8 mb-2 opacity-50" />
                <span>No invoice data found</span>
              </div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={invoiceStatusData.filter(item => item.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="status"
                      >
                        {invoiceStatusData.filter(item => item.count > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={INVOICE_STATUS_COLORS[entry.status] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} Invoices`, 'Volume']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2.5 mt-4 sm:mt-0 sm:pl-4">
                  {invoiceStatusData.map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: INVOICE_STATUS_COLORS[item.status] }}
                        ></span>
                        <span className="font-semibold text-slate-655">{item.status}</span>
                      </div>
                      <span className="font-bold text-slate-800 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Purchase Orders Status (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Purchase Orders by Status</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribution of Purchase Order contract records.</p>
          </div>
          <div className="flex-1 mt-6 flex flex-col sm:flex-row items-center justify-between">
            {isLoading ? (
              <div className="w-full h-52 bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading PO breakdown...</div>
            ) : poData.every(item => item.count === 0) ? (
              <div className="w-full h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                <FileSpreadsheet className="h-8 w-8 mb-2 opacity-50" />
                <span>No PO data found</span>
              </div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={poData.filter(item => item.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="status"
                      >
                        {poData.filter(item => item.count > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PO_STATUS_COLORS[entry.status] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} POs`, 'Volume']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2.5 mt-4 sm:mt-0 sm:pl-4">
                  {poData.map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: PO_STATUS_COLORS[item.status] }}
                        ></span>
                        <span className="font-semibold text-slate-655">{item.status}</span>
                      </div>
                      <span className="font-bold text-slate-800 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Vendors by Invoice Volume (Horizontal Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Top Vendors by Invoice Volume</h2>
            <p className="text-xs text-slate-400 mt-0.5">Top 5 business suppliers with highest invoice ingestion activity.</p>
          </div>
          <div className="flex-1 mt-6 h-60">
            {isLoading ? (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading top vendors...</div>
            ) : vendorData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Building className="h-8 w-8 mb-2 opacity-50" />
                <span>No matched vendor invoice data found</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vendorData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="vendorName" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    formatter={(value) => [`${value} Invoices`, 'Volume']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                  />
                  <Bar dataKey="invoiceCount" fill="#0ea5e9" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Exceptions by Type (Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Exceptions by Type</h2>
            <p className="text-xs text-slate-400 mt-0.5">Frequency breakdown of compliance validation flags.</p>
          </div>
          <div className="flex-1 mt-6 h-60">
            {isLoading ? (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading validation anomalies...</div>
            ) : exceptionData.every(item => item.count === 0) ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                <span>No compliance exceptions found</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={exceptionData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => value.split(' ').slice(0, 2).join(' ')} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    formatter={(value) => [`${value} Exceptions`, 'Occurrences']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} 
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Lists / Queues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Ready for Payment Invoices Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[440px]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ready for Payment</h2>
            <p className="text-xs text-slate-500 mt-1">Invoices that have completed verification steps and are awaiting payment processing.</p>
          </div>

          <div className="flex-1 mt-6 overflow-hidden">
            {isLoading ? (
              // Skeletal list
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div className="space-y-1.5 w-1/2">
                      <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
                      <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                    </div>
                    <div className="h-3 w-1/6 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : readyForPayment.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12">
                <CreditCard className="h-8 w-8 mb-2 opacity-50" />
                <span>No invoices currently ready for payment</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="ready-payment-table">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      <th className="pb-3">Invoice No.</th>
                      <th className="pb-3">Vendor</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3 text-right">Validated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {readyForPayment.map((inv) => (
                      <tr 
                        key={inv.id} 
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <td className="py-3.5 font-bold text-brand-650 group-hover:underline">{inv.invoiceNumber}</td>
                        <td className="py-3.5 text-slate-800 font-medium truncate max-w-[140px]">{inv.vendor}</td>
                        <td className="py-3.5 font-semibold text-slate-800">{formatCurrency(inv.amount)}</td>
                        <td className="py-3.5 text-right text-slate-400 text-xs">{formatDate(inv.validatedDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Panel (Audit Events) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[440px]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
            <p className="text-xs text-slate-500 mt-1">Real-time audit log stream captured from workflow events.</p>
          </div>

          <div className="flex-1 mt-6 overflow-hidden">
            {isLoading ? (
              // Skeletal list
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div className="space-y-1.5 w-1/2">
                      <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                      <div className="h-2 w-1/3 bg-slate-105 rounded"></div>
                    </div>
                    <div className="h-3 w-1/5 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12">
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <span>No recent audit logs available</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="audit-log-table">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">User</th>
                      <th className="pb-3 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {recentActivity.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 text-slate-400 text-xs whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                        <td className="py-3.5 text-slate-800 font-medium text-xs max-w-[120px] truncate" title={log.action}>{log.action}</td>
                        <td className="py-3.5 text-slate-500 text-xs truncate max-w-[100px]">{log.user}</td>
                        <td className="py-3.5 text-right font-semibold text-brand-650 text-xs whitespace-nowrap">{log.invoiceNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
