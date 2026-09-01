import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useNotifications } from '@/shared/stores/notificationStore.js';
import { getMyTaskHierarchy, updateProgress, updateTask } from '../services/taskService';
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
  const { isAnyAdmin, user } = useAuth();
  const { toast } = useToast();
  const { notifications, markRead } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusTaskId = searchParams.get('task');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [hierarchy, setHierarchy] = useState({ tasks: [], projectsById: {}, clientTree: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [viewingTaskReadOnly, setViewingTaskReadOnly] = useState(false);

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

  // Per-task actions available to the employee who is assigned to that task.
  // An employee may only edit/delete the tasks they are assigned to; tasks
  // they aren't assigned to are read-only (no Edit/Delete, drag is still
  // allowed so they can move their own tasks between columns).
  // Uses the backend-computed is_assigned flag (which covers User, Department,
  // and Position assignments) so the UI matches the actual access rules.
  const isAssignedTask = useCallback((task) => {
    if (task.is_assigned != null) return task.is_assigned;
    return (task.assignments || []).some(
      (a) => a.assignment_type === 'User' && String(a.reference_id) === String(user?.id)
    );
  }, [user]);

  // Opening a task clears its unread assignment notification so its red "new"
  // badge disappears and the header count decrements.
  const handleViewTask = useCallback((task) => {
    setViewingTaskId(task.id);
    setViewingTaskReadOnly(!isAssignedTask(task));
    const notif = unreadTaskNotifications.find((n) => String(n.entity_id) === String(task.id));
    if (notif) markRead(notif.id);
  }, [unreadTaskNotifications, markRead, isAssignedTask]);

  const handleEditTask = useCallback((task) => {
    setViewingTaskId(task.id);
  }, []);

  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      await updateTask(taskId, { status: 'Cancelled' });
      await load();
      toast.success('Task cancelled');
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  }, [load, toast]);

  const handleStatusChange = useCallback(async (task, newStatus) => {
    const changes = { status: newStatus };
    if (newStatus === 'Completed') changes.completion_rate = 100;
    try {
      await updateProgress({ task_id: task.id, ...changes });
      await load();
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  }, [load, toast]);

  const handleProgressChange = useCallback(async (taskId, rate) => {
    const task = (hierarchy.tasks || []).find((t) => t.id === taskId);
    if (task && (task.status === 'Completed' || task.status === 'Cancelled')) {
      toast.error('Update the Status Before editing the progress rate');
      return;
    }
    try {
      await updateProgress({ task_id: taskId, completion_rate: rate });
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to update progress');
    }
  }, [hierarchy, load, toast]);

  const handleInlineUpdate = useCallback(async (task, changes) => {
    try {
      await updateTask(task.id, { ...task, ...changes });
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to update task');
    }
  }, [load, toast]);

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
          canManageTask={isAssignedTask}
          storageKey="ppm:mytasks:view"
          activeViews={TASK_VIEW_KEYS.filter((k) => k !== 'portfolio')}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onInlineUpdate={handleInlineUpdate}
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
        onClose={() => { setViewingTaskId(null); setViewingTaskReadOnly(false); }}
        onUpdated={load}
        onOpenTask={(id) => setViewingTaskId(id)}
        readOnly={viewingTaskReadOnly}
      />
    </div>
  );
}
