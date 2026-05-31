import { useState, useEffect, useCallback } from 'react';
import { Plus, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
import TrainingStats from '@/components/trainings/TrainingStats';
import useTrainingFilters from '@/hooks/useTrainingFilters';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import TrainingCard from '@/components/trainings/TrainingTable';

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
  const { isAnyAdmin } = useAuth();
  const { addToast } = useToast();
  const [trainings, setTrainings]     = useState([]);
  const [allTrainings, setAllTrainings] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [totalCount, setTotalCount]   = useState(0);

  const { filters, setFilters, resetFilters, debouncedSearch } = useTrainingFilters();

  const [page, setPage]   = useState(1);
  const [limit]           = useState(12);
  const [sortAsc, setSortAsc]   = useState(true);

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

      const [internalResult, externalResult] = await Promise.all([
        fetchInternal ? getTrainings(internalParams)         : Promise.resolve(null),
        fetchExternal ? getExternalTrainings(externalParams) : Promise.resolve(null),
      ]);

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

      const internalRows = (internalResult?.data?.trainings || []).map(t => ({
        ...t,
        _source: 'internal',
      }));
      const externalRows = (externalResult?.data?.trainings || []).map(t => ({
        ...t,
        _source: 'external',
      }));

      const merged = [...internalRows, ...externalRows].sort((a, b) => {
        const dateA = new Date(a.start_datetime || a.start_date || 0);
        const dateB = new Date(b.start_datetime || b.start_date || 0);
        return sortAsc ? dateA - dateB : dateB - dateA;
      });

      const internalTotal = internalResult?.data?.pagination?.total || 0;
      const externalTotal = externalResult?.data?.pagination?.total || 0;

      const pageRows = isMerged
        ? merged.slice((page - 1) * limit, page * limit)
        : merged;

      setTrainings(pageRows);
      setAllTrainings(merged);
      setTotalCount(isMerged ? internalTotal + externalTotal : (internalTotal || externalTotal));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filters, sortAsc]);

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
      {isAnyAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingTraining(null);
              setNewScheduleKind('internal');
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm shadow-blue-500/20"
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-semibold shadow-sm shadow-violet-500/20"
          >
            <Plus size={16} />
            External training
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      {!loading && !error && allTrainings.length > 0 && (
        <TrainingStats trainings={allTrainings} />
      )}

      {/* ── Filters ── */}
      <TrainingFilters
        filters={filters}
        sortAsc={sortAsc}
        onSortToggle={() => setSortAsc(s => !s)}
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
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Loading trainings...</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {trainings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                            <ClipboardCheck className="text-neutral-400" size={24} strokeWidth={1.5} />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">No trainings found</p>
                          <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {debouncedSearch || filters.status !== 'all' || filters.activityType !== 'all' || filters.source !== 'all'
                              ? 'No trainings match your current filters. Try adjusting your search or filter criteria.'
                              : 'Get started by creating your first training session. Click the button above to schedule a new training.'}
                          </p>
                          {isAnyAdmin && !debouncedSearch && filters.status === 'all' && filters.activityType === 'all' && filters.source === 'all' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTraining(null);
                                setNewScheduleKind('internal');
                                setShowForm(true);
                              }}
                              className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-semibold"
                            >
                              <Plus size={14} />
                              Create training
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    trainings.map((training) => (
                      <TrainingCard
                        key={`${training._source}-${training.id}`}
                        training={training}
                        isAdmin={isAnyAdmin}
                        onEdit={() => handleEditTraining(training)}
                        onDelete={() => openDeleteDialog(training)}
                        onAttendance={() => {
                          const type = training._source === 'external' ? 'external' : 'internal';
                          window.location.href = `/attendance?type=${type}&trainingId=${training.id}`;
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing <span className="font-semibold text-neutral-700 dark:text-neutral-200">{((page - 1) * limit) + 1}</span>
                {' – '}
                <span className="font-semibold text-neutral-700 dark:text-neutral-200">{Math.min(page * limit, totalCount)}</span>
                {' of '}
                <span className="font-semibold text-neutral-700 dark:text-neutral-200">{totalCount}</span>
                {' '}trainings
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'h-8 w-8 text-sm font-medium rounded-lg transition-colors',
                          page === pageNum
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Form Loading Overlay ── */}
      {showForm && formLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white dark:bg-neutral-900 px-8 py-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading training…</p>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
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

      {/* ── Form Modal ── */}
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
