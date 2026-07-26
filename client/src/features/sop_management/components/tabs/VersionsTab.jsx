import { RotateCcw } from 'lucide-react';
import { useSOPVersions } from '../../hooks/useSOPVersions';
import { SOP_STATUS } from '../../constants/sopStatus';

function VersionStatusBadge({ status }) {
  const colors = {
    [SOP_STATUS.DRAFT]: 'bg-gray-100 text-gray-700 border-gray-200',
    [SOP_STATUS.FOR_REVIEW]: 'bg-amber-50 text-amber-700 border-amber-200',
    [SOP_STATUS.APPROVED]: 'bg-blue-50 text-blue-700 border-blue-200',
    [SOP_STATUS.PUBLISHED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [SOP_STATUS.ARCHIVED]: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function VersionsTab({ sopId }) {
  const { versions, loading, error, restore, saving } = useSOPVersions(sopId);

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading versions…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No versions yet. Publish the SOP to create version history.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Version History ({versions.length})</h3>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Change Summary</th>
              <th className="w-16 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {versions.map((version) => (
              <tr key={version.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  v{version.version || '1.0'}
                  {version.is_current ? (
                    <span className="ml-2 text-xs text-blue-600 font-medium">(current)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <VersionStatusBadge status={version.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {version.created_at ? new Date(version.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {version.published_at ? new Date(version.published_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {version.change_summary || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => restore(version.id)}
                    disabled={saving}
                    className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50"
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

