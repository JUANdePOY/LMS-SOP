import { X, Layers } from 'lucide-react';

export default function VersionDrawer({ open, onClose, version, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Version Details {version ? `v${version.version || ''}` : ''}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-4">Loading version details…</div>
          ) : !version ? (
            <div className="text-sm text-gray-500 py-8 text-center">Version not found.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Version</div>
                    <div className="mt-0.5 text-sm font-semibold text-gray-900">v{version.version || '1.0'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</div>
                    <div className="mt-0.5">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        version.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        version.status === 'Archived' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {version.status || 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</div>
                    <div className="mt-0.5 text-sm text-gray-700">
                      {version.created_at ? new Date(version.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  {version.published_at && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Published</div>
                      <div className="mt-0.5 text-sm text-gray-700">
                        {new Date(version.published_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {version.change_summary && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Change Summary</div>
                  <p className="mt-1 text-sm text-gray-700">{version.change_summary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

