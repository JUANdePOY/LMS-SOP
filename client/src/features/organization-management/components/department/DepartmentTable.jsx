import React from 'react';

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
                  <span className="text-sm font-medium text-[var(--text-primary)]">{dept.name}</span>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{dept.code}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{dept.business_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{dept.head_name || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)]">
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(dept)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
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
