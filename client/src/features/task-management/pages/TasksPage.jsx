import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, X, RefreshCw, AlertTriangle, ClipboardList, Clock, XCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useTasks } from '../hooks/useTasks';
import { getTask, updateProgress } from '../services/taskService';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants/taskConstants';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import TaskDetailsModal from '../components/TaskDetailsModal';
import TaskListTable from '../components/TaskListTable';
import TaskListTableSkeleton from '../components/TaskListTableSkeleton';
import TaskForm from '../components/TaskForm';
import ClientsPage from './ClientsPage';
import { StaggerList, MotionItem, FadeIn } from "@/shared/motion";

export default function TasksPage() {
  const { isAnyAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const filters = useMemo(() => ({ search, status: statusFilter, priority: priorityFilter }), [search, statusFilter, priorityFilter]);

  const { tasks, loading, error, stats, refresh, refreshTasks, refreshStats, create, update, remove } = useTasks(filters);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [tab, setTab] = useState('tasks');

  useEffect(() => {
    if (!isAnyAdmin) {
      navigate('/tasks/my', { replace: true });
    }
  }, [isAnyAdmin, navigate]);

  // Load stats once on mount (not on every filter change)
  useEffect(() => {
    if (!isAnyAdmin) return;
    refreshStats();
  }, [isAnyAdmin, refreshStats]);

  // Load tasks on mount and when filters change (debounced)
  useEffect(() => {
    if (!isAnyAdmin) return;
    const timeout = setTimeout(() => refreshTasks(), 300);
    return () => clearTimeout(timeout);
  }, [filters, isAnyAdmin, refreshTasks]);

  const statItems = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-neutral-600 dark:text-neutral-300', bg: 'bg-neutral-50 dark:bg-neutral-500/10' },
      { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-500/10' },
      { label: 'In Progress', value: stats.in_progress, icon: RefreshCw, color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-500/10' },
      { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-500/10' },
      { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-neutral-500 dark:text-neutral-400', bg: 'bg-neutral-50 dark:bg-neutral-500/10' },
    ];
  }, [stats]);

  const hasActiveFilters = search || statusFilter || priorityFilter;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingTask) {
        await update(editingTask.id, payload);
      } else {
        await create(payload);
      }
      setShowForm(false);
      setEditingTask(null);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (task) => {
    try {
      const data = await getTask(task.id);
      setEditingTask(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load task details');
    }
    setShowForm(true);
  };

const [pendingDeleteId, setPendingDeleteId] = useState(null);

const handleDelete = (id) => {
  setPendingDeleteId(id);
};

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    await remove(pendingDeleteId);
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      const payload = { task_id: task.id, status: newStatus };
      if (newStatus === 'Completed') {
        payload.completion_rate = 100;
      }
      await updateProgress(payload);
      toast.success(`Status updated to ${newStatus}`);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleProgressChange = useCallback(async (taskId, rate) => {
    try {
      const payload = { task_id: taskId, completion_rate: rate };
      if (rate === 100) {
        payload.status = 'Completed';
      }
      await updateProgress(payload);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update progress');
    }
  }, [refresh, toast]);

  const handleInlineUpdate = async (task, changes) => {
    const payload = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      start_datetime: task.start_datetime,
      deadline_datetime: task.deadline_datetime,
      estimated_hours: task.estimated_hours,
      category: task.category,
      assignments: (task.assignments || []).map((a) => ({
        assignment_type: a.assignment_type,
        reference_id: a.reference_id,
        reference_name: a.reference_name,
      })),
      ...changes,
    };
    try {
      await update(task.id, payload);
    } catch (err) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  if (!isAnyAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)]">
        {[
          { key: 'tasks', label: 'Tasks' },
          { key: 'clients', label: 'Clients' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'clients' ? (
        <ClientsPage />
      ) : (
        <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Filter size={20} className="text-neutral-400" />
            Tasks & Projects
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Create, assign, and monitor tasks</p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setShowForm(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] transition-colors shadow-sm"
        >
          <Plus size={14} />
          New Task
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <StaggerList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statItems.map((stat) => (
            <MotionItem key={stat.label} className={cn("rounded-lg border border-[var(--border)] px-3 py-2.5", stat.bg)}>
              <div className="flex items-center gap-2">
                <stat.icon size={14} className={stat.color} />
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">{stat.value}</p>
            </MotionItem>
          ))}
        </StaggerList>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
              aria-label="Search tasks"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-sm outline-none focus:border-blue-500 flex-1 sm:flex-none" aria-label="Filter by status">
              <option value="">All Status</option>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-sm outline-none focus:border-blue-500 flex-1 sm:flex-none" aria-label="Filter by priority">
              <option value="">All Priority</option>
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-[var(--bg-hover)] transition-colors shrink-0"
                aria-label="Clear all filters"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Task List */}
      {loading && tasks.length === 0 ? (
        <TaskListTableSkeleton count={5} />
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center">
          <ClipboardList size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)] mb-1">No tasks found</p>
          {hasActiveFilters && (
            <p className="text-xs text-[var(--text-muted)]">Try adjusting your search or filters</p>
          )}
        </div>
      ) : (
        <FadeIn>
          <TaskListTable
            tasks={tasks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onInlineUpdate={handleInlineUpdate}
            onCreateTask={create}
            onViewTask={(task) => setViewingTaskId(task.id)}
            onProgressChange={handleProgressChange}
            canManage
          />
        </FadeIn>
      )}

      <TaskForm
        show={showForm}
        onClose={() => { setShowForm(false); setEditingTask(null); }}
        onSubmit={handleSubmit}
        saving={saving}
        initialData={editingTask}
      />

      <ConfirmationDialog
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />

      <TaskDetailsModal
        taskId={viewingTaskId}
        open={viewingTaskId !== null}
        onClose={() => setViewingTaskId(null)}
      />
      </>
      )}
    </div>
  );
}
