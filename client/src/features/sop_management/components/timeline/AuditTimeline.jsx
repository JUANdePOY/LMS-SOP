import { Shield, User } from 'lucide-react';

export default function AuditTimeline({ logs, loading }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading audit trail…</div>;
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No audit records found.
      </div>
    );
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(b.created_at || b.changed_at || 0) - new Date(a.created_at || a.changed_at || 0)
  );

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {sorted.map((log, index) => (
          <div key={log.id || index} className="relative flex gap-4">
            <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">
              <Shield className="h-4 w-4 text-gray-500" />
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 uppercase">
                  {log.action || log.event_type || 'Event'}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {log.created_at || log.changed_at ? new Date(log.created_at || log.changed_at).toLocaleString() : '—'}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <User className="h-3 w-3" />
                <span>{log.user_name || log.performed_by_name || `User #${log.performed_by || log.user_id}` || 'System'}</span>
              </div>

              {log.details || log.description ? (
                <p className="mt-1 text-sm text-gray-700">{log.details || log.description}</p>
              ) : null}

              {log.old_values && (
                <div className="mt-1 rounded bg-red-50 p-2 text-xs text-red-700">
                  <span className="font-medium">Old:</span>{' '}
                  {typeof log.old_values === 'object' ? JSON.stringify(log.old_values, null, 1) : log.old_values}
                </div>
              )}

              {log.new_values && (
                <div className="mt-1 rounded bg-emerald-50 p-2 text-xs text-emerald-700">
                  <span className="font-medium">New:</span>{' '}
                  {typeof log.new_values === 'object' ? JSON.stringify(log.new_values, null, 1) : log.new_values}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

