import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useNotifications } from '@/shared/stores/notificationStore.js';
import { getMyTaskHierarchy } from '../services/taskService';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import Breadcrumb from '../components/Breadcrumb';
import ProjectTaskViews, { TASK_VIEW_KEYS } from '../components/ProjectTaskViews';
import EntityDetailPanel from '../components/EntityDetailPanel';
import FilterBar from '@/shared/components/ui/FilterBar';
import { ClipboardList, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function MyTasksPage() {
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();
  const { markEntityTypeRead } = useNotifications();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [hierarchy, setHierarchy] = useState({ tasks: [], projectsById: {}, clientTree: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    markEntityTypeRead('task');
  }, [markEntityTypeRead]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTaskHierarchy();
      setHierarchy({
        tasks: data.tasks || [],
        projectsById: data.projectsById || {},
        clientTree: data.clientTree || [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAnyAdmin) return;
    load();
  }, [load, isAnyAdmin]);

  useEffect(() => {
    const timeout = setTimeout(() => load(), 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, priorityFilter, load]);

  const tasks = hierarchy.tasks;

  const displayedTasks = useMemo(() => {
    let result = tasks || [];
    if (statusFilter) {
      result = result.filter((t) => (t.status || '') === statusFilter);
    }
    if (priorityFilter) {
      result = result.filter((t) => (t.priority || '') === priorityFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) => (t.title || '').toLowerCase().includes(q));
    }
    return result;
  }, [tasks, statusFilter, priorityFilter, search]);

  const statItems = useMemo(() => {
    const total = tasks.length;
    const overdue = tasks.filter((t) => t.status === 'Overdue').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const pending = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
    return [
      { label: 'Total', value: total, icon: ClipboardList },
      { label: 'Active', value: pending, icon: Clock },
      { label: 'Completed', value: completed, icon: CheckCircle },
      { label: 'Overdue', value: overdue, icon: AlertTriangle },
    ];
  }, [tasks]);

  if (isAnyAdmin) {
    return <div className="text-sm text-[var(--ppm-text-muted)]">Use the Tasks page to manage all tasks.</div>;
  }

  const hasActiveFilters = search || statusFilter || priorityFilter;

  return (
    <div className="ppm max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">My Tasks &amp; Projects</h1>
        <p className="text-xs text-[var(--ppm-text-muted)] mt-0.5">
          Projects you're assigned to and the progress of every task within them
        </p>
      </div>

      {statItems && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--ppm-border)] pb-3 text-xs text-[var(--ppm-text-muted)]">
          {statItems.map((stat) => {
            const Icon = stat.icon;
            return (
              <span key={stat.label} className="inline-flex items-center gap-1.5">
                <Icon size={13} className="text-[var(--ppm-text-muted)]" />
                <span className="font-semibold tabular-nums text-[var(--ppm-text)]">{stat.value}</span>
                <span>{stat.label}</span>
              </span>
            );
          })}
        </div>
      )}

      <FilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatus={setStatusFilter}
        statusOptions={TASK_STATUSES}
        priorityFilter={priorityFilter}
        onPriority={setPriorityFilter}
        priorityOptions={TASK_PRIORITIES}
      />

      {error && (
        <div className="mb-4 text-sm text-red-600">{error}</div>
      )}

      {displayedTasks.length === 0 && !loading ? (
        <div className="ppm-empty">
          <ClipboardList size={28} />
          <p className="text-sm">No tasks found</p>
          {hasActiveFilters && (
            <p className="text-xs">Try adjusting your search or filters</p>
          )}
        </div>
      ) : (
        <ProjectTaskViews
          tasks={displayedTasks}
          loading={loading}
          projectsById={hierarchy.projectsById}
          clientTree={hierarchy.clientTree}
          canManage={false}
          storageKey="ppm:mytasks:view"
          activeViews={TASK_VIEW_KEYS.filter((k) => k !== 'portfolio')}
          onViewTask={(task) => setViewingTaskId(task.id)}
          onView={(task) => setViewingTaskId(task.id)}
        />
      )}

      <EntityDetailPanel
        type="task"
        taskId={viewingTaskId}
        open={viewingTaskId !== null}
        onClose={() => setViewingTaskId(null)}
        onUpdated={load}
        onOpenTask={(id) => setViewingTaskId(id)}
      />
    </div>
  );
}
