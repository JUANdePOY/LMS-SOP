import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useMyTasks } from '../hooks/useMyTasks';
import { updateProgress } from '../services/taskService';
import { TASK_STATUSES } from '../constants/taskConstants';
import TaskListTable from '../components/TaskListTable';
import TaskListTableSkeleton from '../components/TaskListTableSkeleton';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { FadeIn } from "@/shared/motion";

export default function MyTasksPage() {
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filters = useMemo(() => ({ search, status: statusFilter }), [search, statusFilter]);
  const { tasks, loading, error, refresh } = useMyTasks(filters);
  const [viewingTaskId, setViewingTaskId] = useState(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timeout = setTimeout(() => refresh(), 300);
    return () => clearTimeout(timeout);
  }, [filters, refresh]);

  const handleStatusChange = useCallback(async (task, newStatus) => {
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
  }, [refresh, toast]);

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

  if (isAnyAdmin) {
    return <div className="text-sm text-[var(--text-muted)]">Use the Tasks page to manage all tasks.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">My Tasks</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Tasks assigned to you</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full sm:w-64 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
              aria-label="Search tasks"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {loading && tasks.length === 0 ? (
        <TaskListTableSkeleton count={3} />
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center">
          <Search size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)] mb-1">No tasks assigned to you.</p>
        </div>
      ) : (
        <FadeIn>
          <TaskListTable
            tasks={tasks}
            onStatusChange={handleStatusChange}
            onViewTask={(task) => setViewingTaskId(task.id)}
            onProgressChange={handleProgressChange}
            canManage={false}
          />
        </FadeIn>
      )}

      <TaskDetailsModal
        taskId={viewingTaskId}
        open={viewingTaskId !== null}
        onClose={() => setViewingTaskId(null)}
      />
    </div>
  );
}
