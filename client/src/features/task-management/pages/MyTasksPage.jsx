import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useMyTasks } from '../hooks/useMyTasks';
import { updateProgress } from '../services/taskService';
import { TASK_STATUSES, PRIORITY_STYLES, STATUS_STYLES } from '../constants/taskConstants';
import { formatDate } from '../utils/taskDateUtils';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import ProgressModal from '../components/ProgressModal';

export default function MyTasksPage() {
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filters = useMemo(() => ({ search, status: statusFilter }), [search, statusFilter]);
  const { tasks, loading, error, refresh } = useMyTasks(filters);
  const [progressTask, setProgressTask] = useState(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timeout = setTimeout(() => refresh(), 300);
    return () => clearTimeout(timeout);
  }, [filters, refresh]);  const handleProgress = async (payload) => {
    try {
      await updateProgress({ task_id: progressTask.id, ...payload });
      toast.success('Progress updated');
      setProgressTask(null);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update progress');
    }
  };

  if (isAnyAdmin) {
    return <div className="text-sm text-[var(--text-muted)]">Use the Tasks page to manage all tasks.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">My Tasks</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Tasks assigned to you</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="w-full sm:w-64 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-sm outline-none focus:border-blue-500">
            <option value="">All Status</option>
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="space-y-3">
        {loading && tasks.length === 0 ? (
          <TaskCardSkeleton count={3} />
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--text-muted)]">No tasks assigned to you.</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline break-words leading-snug">{task.title}</span>
                  {task.description && <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">{task.description}</p>}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium}`}>{task.priority}</span>
                    <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status] || STATUS_STYLES.Pending}`}>{task.status}</span>
                    {task.category && <span className="text-xs text-[var(--text-muted)]">{task.category}</span>}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setProgressTask(task); }} className="shrink-0 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800">
                  Update Progress
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>Start: {formatDate(task.start_datetime)}</span>
                <span>Deadline: {formatDate(task.deadline_datetime)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <ProgressModal open={!!progressTask} onClose={() => setProgressTask(null)} onSubmit={handleProgress} saving={false} />
    </div>
  );
}
