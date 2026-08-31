import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useNotifications } from '@/shared/stores/notificationStore.js';
import { getMyTaskHierarchy } from '../services/taskService';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import Breadcrumb from '../components/Breadcrumb';
import ProjectTaskViews, { TASK_VIEW_KEYS } from '../components/ProjectTaskViews';
import EntityDetailPanel from '../components/EntityDetailPanel';
import FilterBar from '@/shared/components/ui/FilterBar';
import { ClipboardList, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';

function getProjectId(task) {
  return task?.project_id ?? task?.projectId ?? task?.project?.id ?? null;
}

export default function MyTasksPage() {
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();
  const { notifications, markRead } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusTaskId = searchParams.get('task');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [hierarchy, setHierarchy] = useState({ tasks: [], projectsById: {}, clientTree: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // When arriving from a "You have been assigned a task" banner, scope the
  // table to the single project tree that contains that task.
  const [scope, setScope] = useState(null);
  useEffect(() => {
    if (!focusTaskId) {
      setScope(null);
      return;
    }
    const task = (hierarchy.tasks || []).find((t) => String(t.id) === String(focusTaskId));
    if (!task) {
      setScope(null);
      return;
    }
    const projectId = getProjectId(task);
    const proj = projectId != null ? hierarchy.projectsById[String(projectId)] : null;
    setScope({
      clientId: proj?.client_id ?? null,
      businessId: proj?.client_business_id ?? null,
      projectId: projectId ?? null,
    });
  }, [focusTaskId, hierarchy.tasks, hierarchy.projectsById]);

  // Identify tasks that still have an unread assignment notification so we can
  // surface a red "New" badge on each task row. The badge clears for a task once
  // the user opens it (see handleViewTask), rather than being wiped on page load
  // — that way the employee actually notices it.
  const unreadTaskNotifications = useMemo(
    () => (notifications || []).filter((n) => n.entity_type === 'task' && !n.is_read && n.entity_id),
    [notifications]
  );
  const newTaskIds = useMemo(
    () => new Set(unreadTaskNotifications.map((n) => String(n.entity_id))),
    [unreadTaskNotifications]
  );

  const scopedClientTree = useMemo(() => {
    if (!scope) return hierarchy.clientTree;
    return (hierarchy.clientTree || [])
      .filter((c) => !scope.clientId || String(c.id) === String(scope.clientId))
      .map((c) => ({
        ...c,
        businesses: (c.businesses || []).filter(
          (b) => !scope.businessId || String(b.id) === String(scope.businessId)
        ),
      }));
  }, [hierarchy.clientTree, scope]);

  const scopedProjectsById = useMemo(() => {
    if (!scope || !scope.projectId) return hierarchy.projectsById;
    const p = hierarchy.projectsById[String(scope.projectId)];
    return p ? { [scope.projectId]: p } : {};
  }, [hierarchy.projectsById, scope]);

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

  // Opening a task clears its unread assignment notification so its red "new"
  // badge disappears and the header count decrements.
  const handleViewTask = useCallback((task) => {
    setViewingTaskId(task.id);
    const notif = unreadTaskNotifications.find((n) => String(n.entity_id) === String(task.id));
    if (notif) markRead(notif.id);
  }, [unreadTaskNotifications, markRead]);

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

  // When scoped to a single task (from the assignment banner), show only the
  // project tree that contains it.
  const scopedTasks = useMemo(() => {
    if (!scope || !scope.projectId) return displayedTasks;
    return (tasks || []).filter((t) => String(getProjectId(t)) === String(scope.projectId));
  }, [tasks, displayedTasks, scope]);

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

      {scope?.projectId && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--ppm-border)] bg-[var(--bg-surface)] px-3 py-2 text-xs">
          <span className="min-w-0 truncate text-[var(--ppm-text-muted)]">
            Showing the task tree for{' '}
            <span className="font-medium text-[var(--text-primary)]">
              {hierarchy.projectsById[String(scope.projectId)]?.name || 'this project'}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[var(--ppm-text-muted)] transition-colors hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X size={12} /> Clear
          </button>
        </div>
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
          tasks={scopedTasks}
          loading={loading}
          projectsById={scopedProjectsById}
          clientTree={scopedClientTree}
          canManage={false}
          storageKey="ppm:mytasks:view"
          activeViews={TASK_VIEW_KEYS.filter((k) => k !== 'portfolio')}
          onViewTask={handleViewTask}
          onView={handleViewTask}
          scopeClientId={scope?.clientId}
          scopeBusinessId={scope?.businessId}
          showCountBadges={true}
          newTaskIds={newTaskIds}
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
