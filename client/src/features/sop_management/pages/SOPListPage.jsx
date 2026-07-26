import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useSOPList } from '../hooks/useSOPList';
import { useSOPPermission } from '../context/SOPPermissionContext';
import { useSOPModal } from '../context/SOPModalContext';
import SOPCreateWizard from '../components/modals/SOPCreateWizard';

const STATUS_OPTIONS = ['Draft', 'For Review', 'Approved', 'Published', 'Archived'];

const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
  { value: 'status', label: 'Status' },
];

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SOPListPage() {
  const navigate = useNavigate();
  const { sops, loading, error, refresh } = useSOPList();
  const { canCreate } = useSOPPermission();
  const { modalState, openModal, closeModal } = useSOPModal();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sort, setSort] = useState('updated_desc');

  const departmentOptions = useMemo(() => {
    const seen = new Map();
    (sops || []).forEach((sop) => {
      const id = sop.department_id;
      if (id == null) return;
      if (!seen.has(id)) seen.set(id, sop.department_name || `Department #${id}`);
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [sops]);

  const filteredSops = useMemo(() => {
    const term = query.trim().toLowerCase();

    let result = (sops || []).filter((sop) => {
      if (term) {
        const haystack = `${sop.title || ''} ${sop.code || ''} ${sop.description || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter !== 'all' && (sop.status || 'Draft') !== statusFilter) return false;
      if (departmentFilter !== 'all' && String(sop.department_id) !== String(departmentFilter)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sort === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      if (sort === 'title_desc') return (b.title || '').localeCompare(a.title || '');
      if (sort === 'status') return (a.status || '').localeCompare(b.status || '');
      // updated_desc (default) — falls back to id order if no timestamp is present
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      if (aTime || bTime) return bTime - aTime;
      return (b.id || 0) - (a.id || 0);
    });

    return result;
  }, [query, sops, statusFilter, departmentFilter, sort]);

  const hasActiveFilters = statusFilter !== 'all' || departmentFilter !== 'all' || query.trim().length > 0;

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-600">SOP Management</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Standard operating procedures</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Browse, review, and publish SOPs from one central workspace.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => openModal('create')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create SOP
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search SOPs by title, code, or description"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--text-muted)]" />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="all">All departments</option>
              {departmentOptions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
          Loading SOPs…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : filteredSops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-muted)]">
          {hasActiveFilters
            ? 'No SOPs match your filters.'
            : 'No SOPs found yet. Create the first one to get started.'}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredSops.map((sop) => (
            <button
              key={sop.id}
              type="button"
              onClick={() => navigate(`/sops/${sop.id}`)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{sop.title || 'Untitled SOP'}</h2>
                    <p className="text-sm text-[var(--text-muted)]">{sop.code || 'No code'}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-gray-600">
                  {sop.status || 'Draft'}
                </span>
              </div>

              <p className="mt-4 line-clamp-2 text-sm text-[var(--text-muted)]">
                {sop.description || 'No description provided yet.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
                <span>Dept: <span className="font-medium text-[var(--text-primary)]">{sop.department_name || (sop.department_id ? `#${sop.department_id}` : '—')}</span></span>
                <span>Owner: <span className="font-medium text-[var(--text-primary)]">{sop.owner_name || '—'}</span></span>
                <span>Updated: <span className="font-medium text-[var(--text-primary)]">{formatDate(sop.updated_at)}</span></span>
              </div>
            </button>
          ))}
        </div>
      )}

      <SOPCreateWizard
        open={modalState.create}
        onClose={() => closeModal('create')}
        onCreated={() => refresh()}
      />
    </div>
  );
}