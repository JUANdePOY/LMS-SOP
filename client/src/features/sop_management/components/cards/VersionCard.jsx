import { RotateCcw } from 'lucide-react';

function VersionStatusBadge({ status }) {
  const colors = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    'For Review': 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200',
    Published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Archived: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function VersionCard({ version, onRestore, disabled }) {
  if (!version) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              v{version.version || '1.0'}
            </span>
            <VersionStatusBadge status={version.status} />
            {version.is_current && (
              <span className="text-xs font-medium text-blue-600">Current</span>
            )}
          </div>

          <div className="mt-2 space-y-1 text-xs text-gray-500">
            <div>
              Created: {version.created_at ? new Date(version.created_at).toLocaleDateString() : '—'}
            </div>
            {version.published_at && (
              <div>
                Published: {new Date(version.published_at).toLocaleDateString()}
              </div>
            )}
          </div>

          {version.change_summary && (
            <p className="mt-2 text-sm text-gray-700">{version.change_summary}</p>
          )}
        </div>

        {onRestore && version.status !== 'Published' && (
          <button
            type="button"
            onClick={() => onRestore(version.id)}
            disabled={disabled}
            className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50"
            title="Restore this version"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

