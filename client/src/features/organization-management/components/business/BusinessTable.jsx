import { useMemo, useState } from 'react';
import { Pencil, Trash2, Building2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const COLUMNS = [
  { key: 'business_name', label: 'Business', sortable: true },
  { key: 'business_code', label: 'Code', sortable: true, className: 'hidden sm:table-cell' },
  { key: 'department_count', label: 'Departments', sortable: true, className: 'hidden md:table-cell' },
  { key: 'status', label: 'Status', sortable: true },
];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-9 w-9 rounded-full bg-[var(--bg-page)]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-3.5 w-32 rounded bg-[var(--bg-page)]" />
        <div className="mt-2 h-3 w-20 rounded bg-[var(--bg-page)]" />
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        <div className="h-3 w-14 rounded bg-[var(--bg-page)]" />
      </td>
      <td className="hidden md:table-cell px-4 py-3">
        <div className="h-3 w-8 rounded bg-[var(--bg-page)]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 rounded-full bg-[var(--bg-page)]" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-4 w-14 rounded bg-[var(--bg-page)]" />
      </td>
    </tr>
  );
}

export default function BusinessTable({ businesses = [], loading, onEdit, onDelete, onToggleStatus }) {
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const sorted = useMemo(() => {
    if (!sortField) return businesses;
    const copy = [...businesses];
    copy.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (sortField === 'department_count') {
        av = av || 0;
        bv = bv || 0;
        return sortOrder === 'asc' ? av - bv : bv - av;
      }
      av = (av || '').toString().toLowerCase();
      bv = (bv || '').toString().toLowerCase();
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [businesses, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (!loading && (!businesses || businesses.length === 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
        <Building2 className="mx-auto h-9 w-9 text-[var(--text-muted)] mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-[var(--text-primary)]">No businesses yet</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)]">Logo</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] ${col.className || ''}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                    >
                      {col.label}
                      {sortField === col.key ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : sorted.map((business) => {
                  const isActive = business.status === 'active';
                  return (
                    <tr key={business.id} className="group hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-page)]">
                          {business.logo_url ? (
                            <img src={business.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold text-[var(--text-muted)]">
                              {initials(business.business_name) || <Building2 className="h-4 w-4" />}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[220px]">
                          {business.business_name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-[220px]">
                          {business.email || (
                            <span className="sm:hidden">{business.business_code}</span>
                          )}
                        </p>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-[var(--text-muted)]">
                        {business.business_code}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <span className="inline-flex items-center justify-center rounded-md bg-[var(--bg-page)] px-2 py-0.5 text-xs font-medium text-[var(--text-primary)] min-w-[1.5rem]">
                          {business.department_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          onClick={() => onToggleStatus && onToggleStatus(business)}
                          className="inline-flex items-center gap-2"
                          title={isActive ? 'Deactivate' : 'Activate'}
                        >
                          <span
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                              isActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                                isActive ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              isActive ? 'text-green-700 dark:text-green-400' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit && onEdit(business)}
                            aria-label={`Edit ${business.business_name}`}
                            title="Edit"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete && onDelete(business)}
                            aria-label={`Delete ${business.business_name}`}
                            title="Delete"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}