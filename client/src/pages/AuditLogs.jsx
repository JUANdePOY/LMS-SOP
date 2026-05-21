import { useState, useEffect, useCallback, useRef } from 'react';
import { History, Search, Eye, X, Calendar, User, Database } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { getAuditLogs, getAuditLogById } from '@/services/auditLogsService';
import { cn } from '@/lib/utils';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

function JsonView({ data, label }) {
  if (data === null || data === undefined) {
    return <div className="text-neutral-500 text-xs italic">No {label.toLowerCase()} data</div>;
  }
  return (
    <pre className="bg-neutral-950 text-emerald-400 p-3 rounded text-[11px] overflow-auto max-h-64 border border-neutral-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AuditLogs() {
  const { addToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const searchRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };
      const result = await getAuditLogs(params);
      if (result.success) {
        setLogs(result.data?.logs || []);
        setTotalCount(result.data?.pagination?.total || 0);
      } else {
        setError(result.message || 'Failed to fetch audit logs');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, actionFilter, entityFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, entityFilter, fromDate, toDate]);

  const openDetail = async (log) => {
    setDetailLoading(true);
    setSelectedLog(null);
    try {
      const res = await getAuditLogById(log.id);
      if (res.success && res.data) {
        setSelectedLog(res.data);
      } else {
        addToast(res.message || 'Failed to load log details', 'error');
      }
    } catch {
      addToast('Network error loading details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedLog(null);

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setEntityFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <History className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
              <p className="text-sm text-neutral-500">Read-only system change history • All actions are immutable</p>
            </div>
          </div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800">
          {totalCount.toLocaleString()} total events
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/60">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action, entity, user email..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Action (e.g. reservist.updated)"
            className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
          />

          <input
            type="text"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder="Entity type (e.g. reservist)"
            className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
          />

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
            title="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
            title="To date"
          />

          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-700 hover:bg-neutral-900 px-4 py-2 text-sm transition-colors"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        </div>
        <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-2">
          <Database className="h-3 w-3" /> All entries are read-only. Changes cannot be edited or deleted.
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-400 w-44">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-400">User</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-400">Action</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-400">Entity</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-400 w-28">IP</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                    Loading audit events...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-400">{error}</td>
                </tr>
              )}

              {!loading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                    No audit events found matching your filters.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-900/60 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400 whitespace-nowrap align-top">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{log.user_email || 'System'}</div>
                          {log.user_role && (
                            <div className="text-[10px] text-neutral-500">{log.user_role}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-indigo-400 align-top">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div>
                        <span className="font-mono text-xs bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                          {log.entity_type}
                        </span>
                        {log.entity_id != null && (
                          <span className="ml-2 text-xs text-neutral-400">#{log.entity_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 align-top font-mono">
                      {log.ip_address || '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        onClick={() => openDetail(log)}
                        className="opacity-60 group-hover:opacity-100 p-1.5 rounded hover:bg-neutral-800 transition-all"
                        title="View full details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3 text-sm">
            <div className="text-neutral-400">
              Page {page} of {totalPages} • {totalCount} records
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={cn(
                  "px-3 py-1 rounded border border-neutral-800",
                  page === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-neutral-900"
                )}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={cn(
                  "px-3 py-1 rounded border border-neutral-800",
                  page >= totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-neutral-900"
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={closeDetail}>
          <div
            className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
              <div>
                <div className="font-semibold text-lg">Audit Log #{selectedLog.id}</div>
                <div className="text-xs text-neutral-500">{formatDate(selectedLog.created_at)}</div>
              </div>
              <button onClick={closeDetail} className="p-2 rounded hover:bg-neutral-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-neutral-500 text-xs mb-1">User</div>
                  <div className="font-medium">{selectedLog.user_email || 'System'} {selectedLog.user_role ? `(${selectedLog.user_role})` : ''}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs mb-1">Action</div>
                  <div className="font-mono text-indigo-400">{selectedLog.action}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs mb-1">Entity</div>
                  <div>
                    <span className="font-mono text-xs bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                      {selectedLog.entity_type}
                    </span>
                    {selectedLog.entity_id != null && <span className="ml-2 text-neutral-400">ID: {selectedLog.entity_id}</span>}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs mb-1">IP Address</div>
                  <div className="font-mono text-xs">{selectedLog.ip_address || '—'}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2 text-neutral-300">
                  <span>Before (old_values)</span>
                </div>
                <JsonView data={selectedLog.old_values} label="Previous" />
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2 text-neutral-300">
                  <span>After (new_values)</span>
                </div>
                <JsonView data={selectedLog.new_values} label="New" />
              </div>

              {selectedLog.user_agent && (
                <div className="text-xs text-neutral-500 border-t border-neutral-800 pt-3">
                  User Agent: <span className="font-mono break-all">{selectedLog.user_agent}</span>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-800 px-5 py-3 text-right">
              <button
                onClick={closeDetail}
                className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-900 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="text-sm text-white">Loading details...</div>
        </div>
      )}
    </div>
  );
}
