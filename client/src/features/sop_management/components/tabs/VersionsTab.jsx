import { RotateCcw } from 'lucide-react';
import { useSOPVersions } from '../../hooks/useSOPVersions';
import { SOP_STATUS } from '../../constants/sopStatus';

function VersionStatusBadge({ status }) {
  const colors = {
    [SOP_STATUS.DRAFT]: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)]',
    [SOP_STATUS.FOR_REVIEW]: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    [SOP_STATUS.APPROVED]: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
    [SOP_STATUS.PUBLISHED]: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    [SOP_STATUS.ARCHIVED]: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function VersionsTab({ sopId }) {
  const { versions, loading, error, restore, saving } = useSOPVersions(sopId);

  if (loading) {
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading versions…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
        No versions yet. Publish the SOP to create version history.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">Version History ({versions.length})</h3>

      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Change Summary</th>
              <th className="w-16 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {versions.map((version) => (
              <tr key={version.id} className="hover:bg-[var(--bg-hover)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                  v{version.version || '1.0'}
                  {version.is_current ? (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium">(current)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <VersionStatusBadge status={version.status} />
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {version.created_at ? new Date(version.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {version.published_at ? new Date(version.published_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">
                  {version.change_summary || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => restore(version.id)}
                    disabled={saving}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                    title="Restore this version"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}