import { RotateCcw } from 'lucide-react';

function VersionStatusBadge({ status }) {
  const colors = {
    Draft: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border)]',
    'For Review': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40',
    Published: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
    Archived: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40',
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function VersionCard({ version, onRestore, disabled }) {
  if (!version) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[var(--text-primary)]">
              v{version.version || '1.0'}
            </span>
            <VersionStatusBadge status={version.status} />
            {version.is_current && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Current</span>
            )}
          </div>

          <div className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
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
            <p className="mt-2 text-sm text-[var(--text-primary)]">{version.change_summary}</p>
          )}
        </div>

        {onRestore && version.status !== 'Published' && (
          <button
            type="button"
            onClick={() => onRestore(version.id)}
            disabled={disabled}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
            title="Restore this version"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}