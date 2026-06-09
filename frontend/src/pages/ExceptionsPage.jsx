import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import exceptionService from '../services/exceptionService';
import authService from '../services/authService';
import vendorService from '../services/vendorService';
import {
  AlertTriangle, Search, Loader2, ArrowRight,
  Filter, Calendar, RefreshCw, UserCheck, XCircle, CheckCircle,
  AlertCircle, ShieldAlert, BadgeAlert, Layers, ChevronRight, CheckSquare, X
} from 'lucide-react';

const ExceptionsPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  const [exceptions, setExceptions] = useState([]);
  const [filteredExceptions, setFilteredExceptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [exRes, vRes] = await Promise.all([
        exceptionService.getExceptions(),
        vendorService.getVendors()
      ]);
      setExceptions(exRes.data || []);
      setVendors(vRes.data || []);

      if (isAdminOrManager) {
        setIsUsersLoading(true);
        const uRes = await authService.getUsers();
        setUsers(uRes.data || []);
        setIsUsersLoading(false);
      }
    } catch (err) {
      console.error('Error fetching exceptions workspace data:', err);
      setError(err.message || 'Failed to retrieve exception records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Apply Client side filters
  useEffect(() => {
    let result = [...exceptions];

    // Status Filter
    if (statusFilter) {
      result = result.filter(ex => ex.status === statusFilter);
    }

    // Severity Filter
    if (severityFilter) {
      result = result.filter(ex => ex.severity === severityFilter);
    }

    // Vendor Filter
    if (vendorFilter) {
      result = result.filter(ex => {
        const matchedVendorId = ex.invoiceId?.matchedVendor?._id || ex.invoiceId?.matchedVendor;
        return matchedVendorId === vendorFilter;
      });
    }

    // Date Filters
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter(ex => new Date(ex.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(ex => new Date(ex.createdAt) <= end);
    }

    // Search Term Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(ex => {
        const invNum = ex.invoiceId?.extractedData?.invoiceNumber || '';
        const desc = ex.description || '';
        const vName = ex.invoiceId?.matchedVendor?.vendorName || ex.invoiceId?.extractedData?.vendorName || '';
        const filename = ex.invoiceId?.originalFileName || '';
        return (
          invNum.toLowerCase().includes(term) ||
          desc.toLowerCase().includes(term) ||
          vName.toLowerCase().includes(term) ||
          filename.toLowerCase().includes(term) ||
          ex.exceptionType.toLowerCase().includes(term)
        );
      });
    }

    setFilteredExceptions(result);
  }, [exceptions, searchTerm, statusFilter, severityFilter, vendorFilter, startDate, endDate]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredExceptions.map(ex => ex._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleQuickAssign = async (exceptionId, userId) => {
    try {
      setError('');
      setSuccess('');
      const res = await exceptionService.assignException(exceptionId, userId);
      setSuccess(res.message || 'Exception assigned successfully.');
      
      // Update local state
      setExceptions(prev => prev.map(ex => {
        if (ex._id === exceptionId) {
          const userObj = users.find(u => u._id === userId);
          return {
            ...ex,
            assignedTo: userObj || null,
            status: ex.status === 'Open' && userId ? 'InProgress' : ex.status
          };
        }
        return ex;
      }));
    } catch (err) {
      setError(err.message || 'Failed to assign exception.');
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignee) return;
    setIsBulkProcessing(true);
    setError('');
    setSuccess('');
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        await exceptionService.assignException(id, bulkAssignee);
        successCount++;
      }
      setSuccess(`Successfully assigned ${successCount} exceptions.`);
      setSelectedIds([]);
      setBulkAssignee('');
      fetchData(); // Reload exceptions to get fully populated state
    } catch (err) {
      setError(err.message || 'Failed to complete bulk assignment.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkClose = async () => {
    if (!window.confirm(`Are you sure you want to close the ${selectedIds.length} selected exceptions? This will trigger automatic invoice validation evaluation.`)) {
      return;
    }
    setIsBulkProcessing(true);
    setError('');
    setSuccess('');
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        await exceptionService.closeException(id, 'Bulk closed from workspace queue.');
        successCount++;
      }
      setSuccess(`Successfully closed ${successCount} exceptions and triggered invoice recovery.`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to close exceptions.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSeverityFilter('');
    setVendorFilter('');
    setStartDate('');
    setEndDate('');
  };

  // Color mappings
  const severityBadge = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    High: 'bg-orange-50 text-orange-800 border-orange-200',
    Critical: 'bg-rose-50 text-rose-800 border-rose-250 font-bold'
  };

  const statusBadge = {
    Open: 'bg-rose-100 text-rose-800 border-rose-200',
    InProgress: 'bg-amber-100 text-amber-800 border-amber-200',
    Resolved: 'bg-indigo-100 text-indigo-850 border-indigo-200',
    Closed: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  };

  // Stats calculation
  const totalActive = exceptions.filter(ex => ex.status !== 'Closed').length;
  const criticalCount = exceptions.filter(ex => (ex.severity === 'Critical' || ex.severity === 'High') && ex.status !== 'Closed').length;
  const openCount = exceptions.filter(ex => ex.status === 'Open').length;
  const myAssignedCount = exceptions.filter(ex => ex.assignedTo?._id === user?._id && ex.status !== 'Closed').length;

  return (
    <div className="space-y-6" id="exceptions-queue-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            Centralized Exception Queue
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Isolate and resolve invoices that fail automated validations. Assign, review, and close issues to recover invoices.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm text-sm font-semibold text-slate-700"
          id="refresh-exceptions-btn"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-rose-50 rounded-xl text-rose-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Exceptions</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{totalActive}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-orange-50 rounded-xl text-orange-500">
            <BadgeAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical & High Issues</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{criticalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-red-50 rounded-xl text-red-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Exceptions</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{openCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-650">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned To Me</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{myAssignedCount}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-250 text-rose-800 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="error-alert">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-850 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in" id="success-alert">
          <CheckSquare className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Advanced Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
            <Filter className="h-4.5 w-4.5 text-brand-600" />
            <span>Search & Filter Workspace</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-brand-650 hover:text-brand-500 font-bold transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice #, description, file..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Severity</label>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700 font-medium"
            >
              <option value="">All Severities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Vendor</label>
            <select
              value={vendorFilter}
              onChange={e => setVendorFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700 font-medium"
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v._id} value={v._id}>{v.vendorName}</option>
              ))}
            </select>
          </div>

          {/* Date range picker */}
          <div className="sm:col-span-1 flex space-x-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="bg-brand-50 border border-brand-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2 text-brand-800 text-sm font-semibold">
            <Layers className="h-5 w-5 text-brand-650" />
            <span>{selectedIds.length} exceptions selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdminOrManager && (
              <div className="flex items-center space-x-2">
                <select
                  value={bulkAssignee}
                  onChange={e => setBulkAssignee(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-sm focus:outline-none text-slate-700 font-medium"
                >
                  <option value="">Select Assignee...</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.role})</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignee || isBulkProcessing}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isBulkProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Assign Selected
                </button>
              </div>
            )}
            <button
              onClick={handleBulkClose}
              disabled={isBulkProcessing}
              className="px-4 py-1.5 bg-white border border-slate-250 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {isBulkProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Close Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-slate-400 hover:text-slate-650"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Table / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
          <span className="text-sm font-semibold tracking-wider text-slate-400">Loading central exception queue...</span>
        </div>
      ) : filteredExceptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 mb-4">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Exceptions Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {searchTerm || statusFilter || severityFilter || vendorFilter
              ? 'No exceptions match your current filtering criteria.'
              : 'Amazing! There are no unresolved validation exceptions in the system.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="exceptions-queue-table">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === filteredExceptions.length}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                  </th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Exception Type</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Invoice Ref</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredExceptions.map((ex) => {
                  const createdDate = new Date(ex.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });
                  const isSelected = selectedIds.includes(ex._id);
                  const invoiceObj = ex.invoiceId || {};
                  const invoiceNum = invoiceObj.extractedData?.invoiceNumber || '-';
                  const vendorName = invoiceObj.matchedVendor?.vendorName || invoiceObj.extractedData?.vendorName || '-';

                  return (
                    <tr key={ex._id} className={`group hover:bg-slate-50/40 transition-colors ${isSelected ? 'bg-brand-50/20' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(ex._id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${severityBadge[ex.severity] || 'bg-slate-100'}`}>
                          {ex.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusBadge[ex.status] || 'bg-slate-100'}`}>
                          {ex.status === 'InProgress' ? 'In Progress' : ex.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{ex.exceptionType}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-[240px] truncate" title={ex.description}>
                        {ex.description}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{invoiceNum}</span>
                          <span className="text-xs text-slate-400 truncate max-w-[150px]">{vendorName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isAdminOrManager && ex.status !== 'Closed' ? (
                          <select
                            value={ex.assignedTo?._id || ex.assignedTo || ''}
                            onChange={(e) => handleQuickAssign(ex._id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-1 px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            disabled={isUsersLoading}
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600 text-xs font-medium">
                            {ex.assignedTo ? `${ex.assignedTo.firstName} ${ex.assignedTo.lastName}` : 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{createdDate}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/exceptions/${ex._id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-650 hover:bg-brand-50 hover:text-brand-500 transition-all border border-transparent hover:border-brand-200"
                          id={`view-exception-${ex._id}`}
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center bg-slate-50/30">
            <span>Showing {filteredExceptions.length} of {exceptions.length} exceptions</span>
            <span>AP Invoice Automation &bull; Exception Queue</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExceptionsPage;
