import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, SlidersHorizontal, Archive } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useSOPList } from '../hooks/useSOPList';
import { useArchiveSOP } from '../hooks/useArchiveSOP';
import { useSOPPermission } from '../context/SOPPermissionContext';
import { useSOPModal } from '../context/SOPModalContext';
import { useToast } from '@/shared/components/Toast';
import SOPCreateWizard from '../components/modals/SOPCreateWizard';
import ArchiveModal from '../components/modals/ArchiveModal';

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
  const { canCreate, canArchive } = useSOPPermission();
  const { modalState, openModal, closeModal } = useSOPModal();
  const { archive, loading: archiving } = useArchiveSOP();
  const { success, error: showError } = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sort, setSort] = useState('updated_desc');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);

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

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archive(archiveTarget);
      success('SOP archived');
      setShowArchiveModal(false);
      setArchiveTarget(null);
      await refresh();
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Unable to archive');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header — matches Dashboard's flat header style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">SOP Management</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Browse, review, and publish SOPs from one central workspace.
          </p>
        </div>

        {canCreate && (
          <Button onClick={() => openModal('create')}>
            <Plus className="h-4 w-4" />
            Create SOP
          </Button>
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
              <Button variant="link" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
          Loading SOPs…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      ) : filteredSops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-muted)]">
          {hasActiveFilters
            ? 'No SOPs match your filters.'
            : 'No SOPs found yet. Create the first one to get started.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSops.map((sop) => (
            <button
              key={sop.id}
              type="button"
              onClick={() => navigate(`/sops/${sop.id}`)}
              className="group flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Icon avatar + status badge */}
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  {sop.status === 'Published' && canArchive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArchiveTarget(sop.id);
                        setShowArchiveModal(true);
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Archive SOP"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                  <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    {sop.status || 'Draft'}
                  </span>
                </div>
              </div>

              {/* Subtitle + title */}
              <div className="min-w-0">
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {sop.code || 'No code'} · Updated {formatDate(sop.updated_at)}
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text-primary)]">
                  {sop.title || 'Untitled SOP'}
                </h2>
              </div>

              {/* Tag pills */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                  {sop.department_name || (sop.department_id ? `Dept #${sop.department_id}` : 'No department')}
                </span>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                  {sop.owner_name || 'Unassigned'}
                </span>
              </div>

              {/* Bottom row: description + action */}
              <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--border)] pt-4">
                <p className="line-clamp-1 min-w-0 flex-1 text-sm text-[var(--text-muted)]">
                  {sop.description || 'No description provided yet.'}
                </p>
                <span className="shrink-0 rounded-lg bg-[var(--btn-bg)] px-4 py-2 text-sm font-medium text-white transition group-hover:bg-[var(--btn-bg-hover)]">
                  View SOP
                </span>
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
      <ArchiveModal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onArchive={handleArchive}
        saving={archiving}
      />
    </div>
  );
}