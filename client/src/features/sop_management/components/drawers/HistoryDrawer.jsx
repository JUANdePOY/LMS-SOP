import { X, History } from 'lucide-react';

export default function HistoryDrawer({ open, onClose, versions, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Version History</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-4">Loading history…</div>
          ) : !versions || versions.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">No version history yet.</div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">v{version.version || '1.0'}</span>
                      {version.is_current && (
                        <span className="text-xs text-blue-600 font-medium">(current)</span>
                      )}
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      version.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      version.status === 'Archived' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {version.status || 'Draft'}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-500">
                    Created: {version.created_at ? new Date(version.created_at).toLocaleDateString() : '—'}
                    {version.published_at ? ` · Published: ${new Date(version.published_at).toLocaleDateString()}` : ''}
                  </div>
                  {version.change_summary && (
                    <p className="mt-1 text-sm text-gray-700">{version.change_summary}</p>
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

