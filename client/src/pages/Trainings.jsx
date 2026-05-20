import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Calendar, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  getTrainings,
  getExternalTrainings,
  getInternalTrainingById,
  getExternalTrainingById,
  deleteTraining,
  deleteExternalTraining,
} from '@/services/trainingsService';
import TrainingForm from '@/components/trainings/TrainingForm';
import TrainingFilters from '@/components/trainings/TrainingFilters';
import useTrainingFilters from '@/hooks/useTrainingFilters';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import TrainingCard from '@/components/trainings/TrainingCard';

const INTERNAL_STATUSES = new Set(['draft', 'published', 'ongoing', 'completed', 'cancelled']);
const EXTERNAL_STATUSES = new Set(['draft', 'open', 'closed', 'completed']);
const INTERNAL_ONLY_STATUSES = new Set(['published', 'ongoing', 'cancelled']);
const EXTERNAL_ONLY_STATUSES = new Set(['open', 'closed']);

function applyFilterUpdates(current, updates) {
  const next = { ...current, ...updates };
  if (updates.source === 'internal' && EXTERNAL_ONLY_STATUSES.has(next.status)) {
    next.status = 'all';
  }
  if (updates.source === 'external') {
    if (INTERNAL_ONLY_STATUSES.has(next.status)) next.status = 'all';
    next.activityType = 'all';
  }
  const source = next.source;
  if (updates.status && source === 'internal' && EXTERNAL_ONLY_STATUSES.has(next.status)) {
    next.status = 'all';
  }
  if (updates.status && source === 'external' && INTERNAL_ONLY_STATUSES.has(next.status)) {
    next.status = 'all';
  }
  return next;
}

export default function Trainings() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const [trainings, setTrainings]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [totalCount, setTotalCount]   = useState(0);

  const { filters, setFilters, resetFilters, debouncedSearch } = useTrainingFilters();

  // Pagination
  const [page, setPage]   = useState(1);
  const [limit]           = useState(10);

  // Modal
  const [showForm, setShowForm]             = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [formLoading, setFormLoading]         = useState(false);
  const [newScheduleKind, setNewScheduleKind] = useState('internal');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTrainings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // ── Decide which sources to fetch ──────────────────────────────────────
      // The backend has two completely separate tables and endpoints:
      //   /trainings/internal  → trainings table
      //   /trainings/external  → external_trainings table
      // We must call both when sourceFilter is 'all', or the matching one only.
      const { source: sourceFilter, status: statusFilter, activityType: activityTypeFilter } = filters;

      const fetchInternal = sourceFilter === 'all' || sourceFilter === 'internal';
      const fetchExternal = sourceFilter === 'all' || sourceFilter === 'external';
      const isMerged = sourceFilter === 'all';

      const rawStatus = statusFilter !== 'all' ? statusFilter : undefined;
      const internalStatus = rawStatus && INTERNAL_STATUSES.has(rawStatus) ? rawStatus : undefined;
      const externalStatus = rawStatus && EXTERNAL_STATUSES.has(rawStatus) ? rawStatus : undefined;

      const apiPage = isMerged ? 1 : page;
      const apiLimit = isMerged ? page * limit : limit;

      const internalParams = {
        page: apiPage,
        limit: apiLimit,
        search: debouncedSearch || undefined,
        status: internalStatus,
        type: activityTypeFilter !== 'all' ? activityTypeFilter : undefined,
      };

      const externalParams = {
        page: apiPage,
        limit: apiLimit,
        search: debouncedSearch || undefined,
        status: externalStatus,
      };

      // Fetch in parallel — only what we need
      const [internalResult, externalResult] = await Promise.all([
        fetchInternal ? getTrainings(internalParams)         : Promise.resolve(null),
        fetchExternal ? getExternalTrainings(externalParams) : Promise.resolve(null),
      ]);

      // Check for errors on either fetch
      if (internalResult && !internalResult.success) {
        setError(internalResult.message || 'Failed to fetch internal trainings');
        setLoading(false);
        return;
      }
      if (externalResult && !externalResult.success) {
        setError(externalResult.message || 'Failed to fetch external trainings');
        setLoading(false);
        return;
      }

      // Tag each record so edit/delete know which endpoint to use
      const internalRows = (internalResult?.data?.trainings || []).map(t => ({
        ...t,
        _source: 'internal',
      }));
      const externalRows = (externalResult?.data?.trainings || []).map(t => ({
        ...t,
        _source: 'external',
      }));

      // Merge and sort by date descending (most recent first)
      const merged = [...internalRows, ...externalRows].sort((a, b) => {
        const dateA = new Date(a.start_datetime || a.start_date || 0);
        const dateB = new Date(b.start_datetime || b.start_date || 0);
        return dateB - dateA;
      });

      const internalTotal = internalResult?.data?.pagination?.total || 0;
      const externalTotal = externalResult?.data?.pagination?.total || 0;

      const pageRows = isMerged
        ? merged.slice((page - 1) * limit, page * limit)
        : merged;

      setTrainings(pageRows);
      setTotalCount(isMerged ? internalTotal + externalTotal : (internalTotal || externalTotal));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filters]);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openDeleteDialog = (training) => setDeleteTarget(training);

  const cancelDelete = () => {
    if (!deleteLoading) setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const result = deleteTarget._source === 'external'
        ? await deleteExternalTraining(deleteTarget.id)
        : await deleteTraining(deleteTarget.id);

      if (result.success) {
        addToast('Training deleted successfully', 'success');
        setDeleteTarget(null);
        fetchTrainings();
      } else {
        addToast(result.message || 'Failed to delete training', 'error');
      }
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormSubmit = () => {
    const wasEditing = !!editingTraining;
    setShowForm(false);
    setEditingTraining(null);
    setFormLoading(false);
    addToast(wasEditing ? 'Training updated successfully' : 'Training created successfully', 'success');
    fetchTrainings();
  };

  const handleEditTraining = async (training) => {
    setShowForm(true);
    setFormLoading(true);
    setEditingTraining(null);

    try {
      const result =
        training._source === 'external'
          ? await getExternalTrainingById(training.id)
          : await getInternalTrainingById(training.id);

      if (!result.success || !result.data) {
        addToast(result.message || 'Failed to load training details', 'error');
        setShowForm(false);
        return;
      }

      const full = { ...result.data, _source: training._source };
      if (training._source !== 'external') {
        full.type = full.type ?? training.type;
        full.instructor = full.instructor ?? training.instructor;
        full.requirements = full.requirements ?? training.requirements;
        const act = full.activities?.[0];
        if (act) {
          full.instructor = full.instructor ?? act.instructor;
          if (act.description) {
            try {
              const meta = JSON.parse(act.description);
              full.type = full.type ?? meta.activityType;
              full.requirements = full.requirements ?? meta.requirements;
            } catch {
              /* plain text description */
            }
          }
        }
      }
      setEditingTraining(full);
    } catch {
      addToast('Network error. Could not load training details.', 'error');
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTraining(null);
    setFormLoading(false);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Trainings & Activities
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Schedule and manage training sessions and activities
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingTraining(null);
                setNewScheduleKind('internal');
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
            >
              <Plus size={16} />
              Internal training
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTraining(null);
                setNewScheduleKind('external');
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-semibold"
            >
              <Plus size={16} />
              External training
            </button>
          </div>
        )}
      </div>

      <TrainingFilters
        filters={filters}
        onChange={(next) => {
          setFilters((f) => {
            const patch = {};
            if (next.search !== f.search) patch.search = next.search;
            if (next.status !== f.status) patch.status = next.status;
            if (next.activityType !== f.activityType) patch.activityType = next.activityType;
            if (next.source !== f.source) patch.source = next.source;
            if (Object.keys(patch).length === 0) return f;
            const updated = applyFilterUpdates(f, patch);
            if (patch.status || patch.activityType || patch.source) setPage(1);
            return updated;
          });
        }}
        onReset={() => {
          resetFilters();
          setPage(1);
        }}
      />
      {/* ── Error ── */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trainings.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="text-neutral-400 dark:text-neutral-500 mb-2">
                  <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-neutral-500 dark:text-neutral-400">No trainings found</p>
              </div>
            ) : (
              trainings.map((training) => (
                <TrainingCard
                  key={`${training._source}-${training.id}`}
                  training={training}
                  isAdmin={isAdmin}
                  onEdit={() => handleEditTraining(training)}
                  onDelete={() => openDeleteDialog(training)}
                  onAttendance={() => {
                    const type = training._source === 'external' ? 'external' : 'internal';
                    window.location.href = `/attendance?type=${type}&trainingId=${training.id}`;
                  }}
                />
              ))
            )}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCount)} of {totalCount} trainings
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Form Modal ── */}
      {showForm && formLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white dark:bg-neutral-900 px-8 py-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading training…</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete training?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” (${
                deleteTarget._source === 'external' ? 'external' : 'internal'
              }) will be permanently removed. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete training"
        cancelLabel="Keep training"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {showForm && !formLoading && (
        <TrainingForm
          key={
            editingTraining
              ? `edit-${editingTraining.id}-${editingTraining._source || 'internal'}`
              : `new-${newScheduleKind}`
          }
          training={editingTraining}
          initialKind={editingTraining ? undefined : newScheduleKind}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

// ─── Training Card ─────────────────────────────────────────────────────────────
function TrainingCard({ training, isAdmin, onEdit, onDelete, onAttendance }) {
  const isExternal = training._source === 'external';

  // Resolve the display date — internal uses start_datetime, external uses start_date
  const displayDate = training.start_datetime || training.start_date;

  // Status chip colour map — covers both internal and external status values
  const statusStyles = {
    published: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    open:      'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    ongoing:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    completed: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    closed:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    draft:     'bg-neutral-50 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  };

  return (
    <div className={cn(
      'relative flex flex-col gap-4 rounded-xl p-5',
      'border border-neutral-200 dark:border-neutral-800',
      'bg-white dark:bg-neutral-900',
      'hover:border-neutral-300 dark:hover:border-neutral-700',
      'hover:shadow-lg dark:hover:shadow-none',
      'transition-all duration-200'
    )}>

      {/* Source badge — top-right corner */}
      <span className={cn(
        'absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
        isExternal
          ? 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20'
          : 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
      )}>
        {isExternal ? 'External' : 'Internal'}
      </span>

      {/* Title + location */}
      <div className="pr-16">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {training.title}
        </h3>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 truncate">
          {training.location || training.venue || 'No location specified'}
        </p>
      </div>

      {/* Type + Status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Activity type — only internal has this */}
        {training.type && (
          <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
            {training.type.charAt(0).toUpperCase() + training.type.slice(1)}
          </span>
        )}

        {/* Status */}
        <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border',
          statusStyles[training.status] || 'bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
        )}>
          {training.status || 'Unknown'}
        </span>
      </div>

      {/* Date (+ capacity for external) */}
      <div className={cn('gap-3', isExternal && 'grid grid-cols-2')}>
        <div className="flex items-start gap-2 text-sm">
          <Calendar size={14} className="text-neutral-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-xs">Start</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              {displayDate ? new Date(displayDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        {isExternal && (
          <div className="flex items-start gap-2 text-sm">
            <Calendar size={14} className="text-neutral-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block text-xs">Capacity</span>
              <span className="text-neutral-700 dark:text-neutral-300">
                {training.capacity ? `${training.capacity} slots` : 'Unlimited'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        {isAdmin && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Edit"
          >
            <Edit size={14} className="text-neutral-500" />
          </button>
        )}

        {isAdmin && (
          <button
            onClick={onAttendance}
            className="p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
            title="Take Attendance"
          >
            <ClipboardCheck size={14} className="text-indigo-500" />
          </button>
        )}

        {isAdmin && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}