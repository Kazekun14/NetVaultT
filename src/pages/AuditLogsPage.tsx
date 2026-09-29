import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { AuditLog } from '../types/index.js';
import { ScrollText, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter, resourceFilter, startDate, endDate, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        ...(search && { search }),
        ...(actionFilter && { action: actionFilter }),
        ...(resourceFilter && { resourceType: resourceFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await apiFetch<{
        success: boolean;
        logs: AuditLog[];
        pagination: { totalPages: number };
      }>(`/audit-logs?${queryParams}`);

      if (res.success) {
        setLogs(res.logs);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeStyle = (action: string) => {
    if (action.includes('REVEALED') || action.includes('COPIED')) {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20';
    }
    if (action.includes('SUCCESS') || action.includes('CREATED')) {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/20';
    }
    if (action.includes('FAILURE') || action.includes('DEACTIVATED') || action.includes('DISABLED')) {
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:border-rose-500/20';
    }
    return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30 dark:border-cyan-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Security Audit Logs</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Immutable audit records of user authentication, device changes, credential reveals, and security events
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by user, action, resource, IP address..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 pl-10"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Actions</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="CREDENTIAL_REVEALED">CREDENTIAL_REVEALED</option>
          <option value="CREDENTIAL_COPIED">CREDENTIAL_COPIED</option>
          <option value="CREDENTIAL_CREATED">CREDENTIAL_CREATED</option>
          <option value="CREDENTIAL_PASSWORD_CHANGED">CREDENTIAL_PASSWORD_CHANGED</option>
          <option value="DEVICE_CREATED">DEVICE_CREATED</option>
          <option value="DEVICE_UPDATED">DEVICE_UPDATED</option>
          <option value="DEVICE_DEACTIVATED">DEVICE_DEACTIVATED</option>
          <option value="SITE_CREATED">SITE_CREATED</option>
          <option value="USER_CREATED">USER_CREATED</option>
        </select>

        {/* Resource Filter */}
        <select
          value={resourceFilter}
          onChange={(e) => {
            setResourceFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Resources</option>
          <option value="AUTH">AUTH</option>
          <option value="DEVICE">DEVICE</option>
          <option value="CREDENTIAL">CREDENTIAL</option>
          <option value="SITE">SITE</option>
          <option value="USER">USER</option>
          <option value="ROLE">ROLE</option>
          <option value="SETTINGS">SETTINGS</option>
        </select>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          />
          <span className="text-slate-400 dark:text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs animate-pulse">Loading audit history...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ScrollText className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No audit activity matches the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Date / Time (UTC)</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Resource</th>
                  <th className="px-4 py-3.5">Device</th>
                  <th className="px-6 py-3.5 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Timestamp */}
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* User */}
                    <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white font-sans">{log.username_snapshot}</td>

                    {/* Action */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Resource Name */}
                    <td className="px-4 py-4 text-cyan-600 dark:text-cyan-400 font-sans font-semibold">
                      {log.resource_name || log.resource_type}
                    </td>

                    {/* Device Name */}
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300 font-sans">{log.device_name || '-'}</td>

                    {/* IP Address */}
                    <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{log.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
