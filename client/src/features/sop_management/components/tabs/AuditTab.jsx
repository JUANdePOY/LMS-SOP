import { History, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAuditLogs } from '../../hooks/useAuditLogs';

export default function AuditTab({ sopId }) {
  const { logs, loading, error, refresh } = useAuditLogs(sopId);

  if (loading) {
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading audit logs…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
        No audit logs yet. Changes to this SOP will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Audit Trail ({logs.length})
          </h3>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[var(--bg-hover)]">
                <td className="px-4 py-3">
                  <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)] uppercase">
                    {log.action || log.event_type || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                  {log.user_name || log.performed_by_name || `User #${log.performed_by || log.user_id}` || 'System'}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">
                  {typeof log.metadata === 'object'
                    ? JSON.stringify(log.metadata)
                    : log.metadata || log.description || '—'}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
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