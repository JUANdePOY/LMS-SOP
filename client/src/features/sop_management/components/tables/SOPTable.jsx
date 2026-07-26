import { FileText } from 'lucide-react';

function StatusBadge({ status }) {
  const colors = {
    Draft: 'bg-gray-100 text-gray-700 border-gray-200',
    'For Review': 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200',
    Published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Archived: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status || 'Draft'}
    </span>
  );
}

export default function SOPTable({ sops, onRowClick, loading }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading SOPs…</div>;
  }

  if (!sops || sops.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No SOPs found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Version</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sops.map((sop) => (
            <tr
              key={sop.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onRowClick?.(sop.id)}
            >
              <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{sop.code || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-gray-900 truncate max-w-xs">{sop.title || 'Untitled'}</span>
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge status={sop.status} /></td>
              <td className="px-4 py-3 text-gray-500">v{sop.version || '1.0'}</td>
              <td className="px-4 py-3 text-gray-600">{sop.department_name || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{sop.owner_name || '—'}</td>
              <td className="px-4 py-3 text-gray-500">{sop.created_at ? new Date(sop.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { StatusBadge };

