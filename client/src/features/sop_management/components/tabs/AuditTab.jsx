import { History, RefreshCw } from 'lucide-react';
import { useAuditLogs } from '../../hooks/useAuditLogs';

export default function AuditTab({ sopId }) {
  const { logs, loading, error, refresh } = useAuditLogs(sopId);

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading audit logs…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No audit logs yet. Changes to this SOP will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Audit Trail ({logs.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 uppercase">
                    {log.action || log.event_type || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {log.user_name || log.performed_by_name || `User #${log.performed_by || log.user_id}` || 'System'}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {typeof log.metadata === 'object'
                    ? JSON.stringify(log.metadata)
                    : log.metadata || log.description || '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

