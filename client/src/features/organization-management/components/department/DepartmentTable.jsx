import { Pencil, Trash2, Building2, Users } from 'lucide-react';

const STATUS_VARIANTS = {
  active: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-800',
  archived: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
};

export default function DepartmentTable({ departments = [], loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
        Loading departments...
      </div>
    );
  }

  if (!departments || departments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
        <Building2 className="mx-auto h-10 w-10 text-[var(--text-muted)] mb-3" />
        <p className="text-sm text-[var(--text-muted)]">No departments found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Department</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Business</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Head</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Users</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{dept.name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{dept.code}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{dept.business_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{dept.head_name || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)]">
                    <Users className="h-3.5 w-3.5" />
                    {dept.user_count || 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_VARIANTS[dept.status] || STATUS_VARIANTS.inactive}`}>
                    {dept.status || 'inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit && onEdit(dept)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(dept)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

