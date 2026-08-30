import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useMyTasks } from '../hooks/useMyTasks';
import { updateProgress, getTask } from '../services/taskService';
import { getProjects } from '../services/projectService';
import { TASK_STATUSES } from '../constants/taskConstants';
import Breadcrumb from '../components/Breadcrumb';
import TaskListView from '../components/TaskListView';
import EntityDetailPanel from '../components/EntityDetailPanel';
import FilterBar from '@/shared/components/ui/FilterBar';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Asana-style My Tasks bucketing. Overdue is NOT its own section (it's shown
// as a red due-date flag inline); it lands in "Later" so it still has a home.
function bucketTask(task) {
  const rate = Number(task.progress_rate ?? task.completion_rate ?? 0);
  if (task.status === 'Cancelled') return null;
  if (!task.deadline_datetime) {
    if (task.status === 'Pending' && rate === 0) return 'recent';
    return 'nodate';
  }
  const diffDays = Math.floor((new Date(task.deadline_datetime) - startOfToday()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays > 0 && diffDays <= 7) return 'upcoming';
  return 'later';
}

export default function MyTasksPage() {
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortMode, setSortMode] = useState('due');
  const filters = useMemo(() => ({ search, status: statusFilter }), [search, statusFilter]);
  const { tasks, loading, error, refresh } = useMyTasks(filters);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [projectsById, setProjectsById] = useState({});

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timeout = setTimeout(() => refresh(), 300);
    return () => clearTimeout(timeout);
  }, [filters, refresh]);

  useEffect(() => {
    let active = true;
    getProjects()
      .then((data) => {
        if (!active) return;
        const arr = Array.isArray(data) ? data : (data?.rows || []);
        const map = {};
        arr.forEach((p) => { map[String(p.id)] = p; });
        setProjectsById(map);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

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

  const handleView = useCallback(async (task) => {
    try {
      const data = await getTask(task.id);
      setViewingTaskId(data.id);
    } catch {
      setViewingTaskId(task.id);
    }
  }, []);

  const projectGroups = useMemo(() => {
    if (sortMode !== 'project') return [];
    const map = {};
    (tasks || []).forEach((t) => {
      const key = t.project_id != null ? String(t.project_id) : '__none__';
      (map[key] = map[key] || []).push(t);
    });
    return Object.entries(map).map(([projectId, items]) => ({
      projectId,
      project: projectsById[projectId] || null,
      items,
    }));
  }, [sortMode, tasks, projectsById]);

  const dueSections = useMemo(() => {
    if (sortMode !== 'due') return [];
    const defs = [
      { key: 'recent', label: 'Recently assigned' },
      { key: 'today', label: 'Today' },
      { key: 'upcoming', label: 'Upcoming' },
      { key: 'later', label: 'Later' },
      { key: 'nodate', label: 'No due date' },
    ];
    return defs
      .map((s) => ({ ...s, items: (tasks || []).filter((t) => bucketTask(t) === s.key) }))
      .filter((s) => s.items.length > 0);
  }, [sortMode, tasks]);

  const sections = useMemo(() => {
    if (sortMode === 'project') {
      return projectGroups.map(({ projectId, project, items }) => ({
        key: projectId,
        label: project?.name || 'Unspecified project',
        count: items.length,
        items,
      }));
    }
    return dueSections;
  }, [sortMode, projectGroups, dueSections]);

  if (isAnyAdmin) {
    return <div className="text-sm text-[var(--ppm-text-muted)]">Use the Tasks page to manage all tasks.</div>;
  }

  return (
    <div className="ppm max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: 'My Tasks' }]} className="mb-3" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">My Tasks</h1>
          <p className="text-xs text-[var(--ppm-text-muted)] mt-0.5">Tasks assigned to you</p>
        </div>
        <div className="inline-flex rounded-lg border border-[var(--ppm-border)] p-0.5">
          <button
            onClick={() => setSortMode('due')}
            className={sortMode === 'due' ? 'ppm-btn-primary' : 'ppm-btn-ghost'}
          >
            Due date
          </button>
          <button
            onClick={() => setSortMode('project')}
            className={sortMode === 'project' ? 'ppm-btn-primary' : 'ppm-btn-ghost'}
          >
            Project
          </button>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatus={setStatusFilter}
        statusOptions={TASK_STATUSES}
      >
        <div className="inline-flex rounded-lg border border-[var(--ppm-border)] p-0.5">
          <button
            onClick={() => setSortMode('due')}
            className={sortMode === 'due' ? 'ppm-btn-primary' : 'ppm-btn-ghost'}
          >
            Due date
          </button>
          <button
            onClick={() => setSortMode('project')}
            className={sortMode === 'project' ? 'ppm-btn-primary' : 'ppm-btn-ghost'}
          >
            Project
          </button>
        </div>
      </FilterBar>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {loading && sections.length === 0 ? (
        <TaskListView sections={[]} loading />
      ) : sections.length === 0 ? (
        <div className="ppm-empty">
          <Search size={28} />
          <p className="text-sm">Nothing assigned to you yet.</p>
        </div>
      ) : (
        <TaskListView
          sections={sections}
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onViewTask={handleView}
        />
      )}

      <EntityDetailPanel
        type="task"
        taskId={viewingTaskId}
        open={viewingTaskId !== null}
        onClose={() => setViewingTaskId(null)}
        onOpenTask={(id) => setViewingTaskId(id)}
      />
    </div>
  );
}
