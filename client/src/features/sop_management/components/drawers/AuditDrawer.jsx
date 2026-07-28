import { X, Shield } from 'lucide-react';

export default function AuditDrawer({ open, onClose, logs, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Audit Trail</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-4">Loading audit logs…</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">No audit logs found.</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 uppercase">
                      {log.action || log.event_type || 'Event'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm text-gray-700">
                    By: {log.user_name || log.performed_by_name || (log.performed_by != null || log.user_id != null ? `User #${log.performed_by || log.user_id}` : 'System')}
                  </div>
                  {log.details || log.description ? (
                    <div className="mt-1 text-xs text-gray-500">
                      {log.details || log.description}
                    </div>
                  ) : null}
                  {log.old_values && (
                    <div className="mt-1 text-xs text-gray-400">
                      Old: {typeof log.old_values === 'object' ? JSON.stringify(log.old_values) : log.old_values}
                    </div>
                  )}
                  {log.new_values && (
                    <div className="mt-0.5 text-xs text-gray-400">
                      New: {typeof log.new_values === 'object' ? JSON.stringify(log.new_values) : log.new_values}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

