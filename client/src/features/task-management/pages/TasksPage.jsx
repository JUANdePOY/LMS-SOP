import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, AlertTriangle, ClipboardList, Clock, XCircle, CheckCircle, RefreshCw, FolderKanban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useTasks } from '../hooks/useTasks';
import { updateProgress } from '../services/taskService';
import { getProjects } from '../services/projectService';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import EntityDetailPanel from '../components/EntityDetailPanel';
import TaskForm from '../components/TaskForm';
import TaskFilters from '../components/TaskFilters';
import TaskCommandPalette from '../components/TaskCommandPalette';
import ProjectFormModal from '../components/ProjectFormModal';
import ProjectTaskViews, { TASK_VIEWS, TASK_VIEW_KEYS } from '../components/ProjectTaskViews';

const VIEW_STORAGE_KEY = 'ppm:tasks:view';

const SAVED_VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue', status: 'Overdue' },
  { key: 'high', label: 'High Priority', priority: 'High' },
  { key: 'critical', label: 'Critical', priority: 'Critical' },
  { key: 'my', label: 'My Tasks', assignee: '__me__' },
];

export default function TasksPage() {
  const { isAnyAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const clientParam = searchParams.get('client');
  const businessParam = searchParams.get('business');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [activeViewKey, setActiveViewKey] = useState('all');

  const filters = useMemo(
    () => ({ search, status: statusFilter, priority: priorityFilter }),
    [search, statusFilter, priorityFilter]
  );

  const { tasks, loading, error, stats, refreshTasks, refreshStats, patchTask, create, update, remove } = useTasks(filters);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [viewingProjectId, setViewingProjectId] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'list');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [, setTaskDefaults] = useState(undefined);

  // All projects, keyed by id, used for hierarchy grouping and scope prefill.
  const [projectsById, setProjectsById] = useState({});
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

  // When a client/business scope is active, seed new-task forms with those
  // values so the user doesn't have to pick them manually.
  const scopeDefaults = useMemo(() => {
    if (!clientParam && !businessParam) return undefined;
    return {
      client_id: clientParam || '',
      client_business_id: businessParam || '',
    };
  }, [clientParam, businessParam]);

  const changeView = useCallback((next) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  }, []);

  // Honour an incoming ?view= query param (e.g. opened from the sidebar panel).
  useEffect(() => {
    if (viewParam && TASK_VIEW_KEYS.includes(viewParam) && viewParam !== view) {
      setView(viewParam);
      localStorage.setItem(VIEW_STORAGE_KEY, viewParam);
    }
  }, [viewParam, view]);

  const openNewTask = useCallback(() => {
    setEditingTask(null);
    setTaskDefaults(scopeDefaults);
    setShowForm(true);
  }, [scopeDefaults]);

  const handleAddProjectTask = useCallback((projectId) => {
    setEditingTask(null);
    const project = projectsById[String(projectId)];
    const defaults = {
      ...scopeDefaults,
      project_id: projectId,
      client_id: project?.client_id ?? scopeDefaults?.client_id ?? '',
      client_business_id: project?.client_business_id ?? scopeDefaults?.client_business_id ?? '',
    };
    Object.keys(defaults).forEach((key) => {
      if (defaults[key] === undefined) delete defaults[key];
    });
    setTaskDefaults(defaults);
    setShowForm(true);
  }, [scopeDefaults, projectsById]);

  const handleQuickCreate = useCallback((title, extra) => {
    setEditingTask(null);
    setTaskDefaults({ ...scopeDefaults, ...(extra || {}), title: title || '' });
    setShowForm(true);
  }, [scopeDefaults]);

  const handleProjectCreated = (project) => {
    setShowProject(false);
    if (project?.id && project?.client_id) {
      navigate(`/clients/${project.client_id}/businesses/${project.client_business_id}/projects/${project.id}`);
    }
  };

  // Keyboard shortcuts: Cmd/Ctrl+K palette, N for new task
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (!typing && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openNewTask();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openNewTask]);

  useEffect(() => {
    if (!isAnyAdmin) {
      navigate('/tasks/my', { replace: true });
    }
  }, [isAnyAdmin, navigate]);

  useEffect(() => {
    if (!isAnyAdmin) return;
    refreshStats();
  }, [isAnyAdmin, refreshStats]);

  useEffect(() => {
    if (!isAnyAdmin) return;
    const timeout = setTimeout(() => refreshTasks(), 300);
    return () => clearTimeout(timeout);
  }, [filters, isAnyAdmin, refreshTasks]);

  const statItems = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total', value: stats.total, icon: ClipboardList },
      { label: 'Pending', value: stats.pending, icon: Clock },
      { label: 'In Progress', value: stats.in_progress, icon: RefreshCw },
      { label: 'Completed', value: stats.completed, icon: CheckCircle },
      { label: 'Overdue', value: stats.overdue, icon: AlertTriangle },
      { label: 'Cancelled', value: stats.cancelled, icon: XCircle },
    ];
  }, [stats]);

  const assigneeOptions = useMemo(() => {
    const seen = new Set();
    (tasks || []).forEach((t) => (t.assignments || []).forEach((a) => {
      if (a.reference_name) seen.add(a.reference_name);
    }));
    return [...seen].sort();
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    let result = tasks || [];
    const taskClientId = (t) => {
      const pid = t.project_id ?? t.projectId ?? t.project?.id;
      const proj = pid != null ? projectsById[String(pid)] : null;
      return proj ? { clientId: proj.client_id, businessId: proj.client_business_id } : null;
    };
    if (clientParam) {
      result = result.filter((t) => String(taskClientId(t)?.clientId) === String(clientParam));
    }
    if (businessParam) {
      result = result.filter((t) => String(taskClientId(t)?.businessId) === String(businessParam));
    }
    if (assigneeFilter) {
      if (assigneeFilter === '__me__') {
        const uid = String(user?.id);
        result = result.filter((t) => (t.assignments || []).some((a) => a.reference_id != null && String(a.reference_id) === uid));
      } else {
        result = result.filter((t) => (t.assignments || []).some((a) => a.reference_name === assigneeFilter));
      }
    }
    return result;
  }, [tasks, assigneeFilter, user, clientParam, businessParam, projectsById]);

  const hasActiveFilters = search || statusFilter || priorityFilter || assigneeFilter;

  const filteredClientName = useMemo(() => {
    if (!clientParam) return null;
    const p = Object.values(projectsById).find((x) => String(x.client_id) === String(clientParam));
    return p?.client_name || null;
  }, [clientParam, projectsById]);

  const filteredBusinessName = useMemo(() => {
    if (!businessParam) return null;
    const p = Object.values(projectsById).find((x) => String(x.client_business_id) === String(businessParam));
    return p?.client_business_name || null;
  }, [businessParam, projectsById]);

  // When a client/business scope is active, restrict the hierarchy source to
  // that scope so the Client -> Business -> Project tree still renders (even
  // with no tasks) for the selected business/client.
  const scopedProjectsById = useMemo(() => {
    if (!clientParam && !businessParam) return projectsById;
    const scoped = {};
    Object.values(projectsById).forEach((p) => {
      if (businessParam && String(p.client_business_id) === String(businessParam)) {
        scoped[String(p.id)] = p;
      } else if (clientParam && String(p.client_id) === String(clientParam)) {
        scoped[String(p.id)] = p;
      }
    });
    return scoped;
  }, [projectsById, clientParam, businessParam]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setActiveViewKey('all');
  }, []);

  const applySavedView = useCallback((key) => {
    const v = SAVED_VIEWS.find((x) => x.key === key);
    if (!v) return;
    setActiveViewKey(key);
    setStatusFilter(v.status || '');
    setPriorityFilter(v.priority || '');
    setAssigneeFilter(v.assignee || '');
  }, []);

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

  const handleEdit = (task) => {
    setViewingTaskId(task.id);
  };

  const handleEditProject = (projectId) => {
    setViewingProjectId(projectId);
  };

  const handleTaskUpdated = useCallback(() => {
    refreshTasks();
    refreshStats();
  }, [refreshTasks, refreshStats]);

  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const handleDelete = (id) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    await remove(pendingDeleteId);
  };

  // Direct delete used by the List tab's inline "Delete?" confirm so it never
  // opens the centered ConfirmationDialog modal.
  const deleteTaskNow = useCallback(async (id) => {
    try {
      await remove(id);
      await refreshStats();
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  }, [remove, refreshStats, toast]);

  const handleStatusChange = useCallback(async (task, newStatus) => {
    const changes = { status: newStatus };
    if (newStatus === 'Completed') {
      changes.completion_rate = 100;
    }
    const rollback = patchTask(task.id, changes);
    try {
      await updateProgress({ task_id: task.id, ...changes });
      toast.success(`Status updated to ${newStatus}`);
      await refreshStats();
    } catch (err) {
      rollback();
      toast.error(err.message || 'Failed to update status');
    }
  }, [patchTask, refreshStats, toast]);

  const handleProgressChange = useCallback(async (taskId, rate) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && (task.status === 'Completed' || task.status === 'Cancelled')) {
      toast.error('Update the Status Before editing the progress rate');
      return;
    }
    const changes = { progress_rate: rate };
    if (rate === 100) {
      changes.status = 'Completed';
    }
    const rollback = patchTask(taskId, changes);
    try {
      await updateProgress({ task_id: taskId, ...changes });
      await refreshStats();
    } catch (err) {
      rollback();
      toast.error(err.message || 'Failed to update progress');
    }
  }, [patchTask, refreshStats, tasks, toast]);

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

  const commands = useMemo(() => {
    const viewCommands = TASK_VIEWS.map((v) => ({
      id: `view-${v.key}`,
      label: `Switch to ${v.label} view`,
      group: 'Navigate',
      icon: v.icon,
      run: () => changeView(v.key),
    }));
    const viewFilters = SAVED_VIEWS.map((sv) => ({
      id: `filter-${sv.key}`,
      label: `Apply filter: ${sv.label}`,
      group: 'Filters',
      run: () => applySavedView(sv.key),
    }));
    const projectCommands = Object.values(projectsById).map((p) => ({
      id: `project-${p.id}`,
      label: `Open project: ${p.name}`,
      group: 'Projects',
      run: () => navigate(`/clients/${p.client_id}/businesses/${p.client_business_id}/projects/${p.id}`),
    }));
    const clientCommands = Object.values(projectsById).reduce((acc, p) => {
      const key = `client-${p.client_id}`;
      if (!acc[key] && p.client_id) {
        acc[key] = {
          id: key,
          label: `Open client: ${p.client_name || p.client_id}`,
          group: 'Clients',
          run: () => navigate(`/clients/${p.client_id}`),
        };
      }
      return acc;
    }, {});
    const businessCommands = Object.values(projectsById).reduce((acc, p) => {
      const key = `business-${p.client_business_id}`;
      if (!acc[key] && p.client_business_id) {
        acc[key] = {
          id: key,
          label: `Open business: ${p.client_business_name || p.client_business_id}`,
          group: 'Businesses',
          run: () => navigate(`/clients/${p.client_id}/businesses/${p.client_business_id}`),
        };
      }
      return acc;
    }, {});
    return [
      { id: 'new-task', label: 'Create new task', group: 'Actions', icon: Plus, run: openNewTask },
      { id: 'clear-filters', label: 'Clear all filters', group: 'Actions', run: clearFilters },
      ...viewCommands,
      ...viewFilters,
      ...Object.values(clientCommands),
      ...Object.values(businessCommands),
      ...projectCommands,
    ];
  }, [projectsById, applySavedView, changeView, clearFilters, navigate, openNewTask]);

  if (!isAnyAdmin) {
    return null;
  }

  return (
    <div className="ppm max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Tasks & Projects
          </h1>
          <p className="text-xs text-[var(--ppm-text-muted)] mt-0.5">Create, assign, and monitor tasks</p>
        </div>
        <button
          onClick={() => setShowProject(true)}
          className="ppm-btn-primary"
        >
          <FolderKanban size={14} />
          New Project
        </button>
      </div>

      {(clientParam || businessParam) && (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-[var(--bg-active)] px-3 py-1 text-[var(--text-on-sidebar)]">
            {businessParam
              ? `Business: ${filteredBusinessName || 'selected'}`
              : `Client: ${filteredClientName || 'selected'}`}
          </span>
          <button
            onClick={() => navigate('/tasks')}
            className="text-[var(--color-primary)] hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Stats — neutral row, no colored fills */}
      {stats && (
        <div className="ppm-stat-row mb-6">
          {statItems.map((stat) => (
            <div key={stat.label} className="ppm-stat">
              <span className="ppm-stat__label">{stat.label}</span>
              <span className="ppm-stat__value">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      <TaskFilters
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatus={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriority={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssignee={setAssigneeFilter}
        assigneeOptions={assigneeOptions}
        savedViews={SAVED_VIEWS}
        activeViewKey={activeViewKey}
        onApplyView={applySavedView}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-950/30">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {displayedTasks.length === 0 && !loading && view !== 'list' ? (
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
          projectsById={scopedProjectsById}
          canManage
          scopeClientId={clientParam}
          scopeBusinessId={businessParam}
          viewProp={view}
          onViewChange={changeView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onInlineUpdate={handleInlineUpdate}
          onViewTask={(task) => setViewingTaskId(task.id)}
          onView={(task) => setViewingTaskId(task.id)}
          onDeleteImmediate={deleteTaskNow}
          onDuplicated={handleTaskUpdated}
          onCreateTask={() => { setEditingTask(null); setTaskDefaults(scopeDefaults); setShowForm(true); }}
          onAddProjectTask={handleAddProjectTask}
          onAddToColumn={(status) => { setEditingTask(null); setTaskDefaults({ ...scopeDefaults, status }); setShowForm(true); }}
          onQuickCreate={handleQuickCreate}
          onEditProject={handleEditProject}
          search={search}
        />
      )}

      <TaskForm
        show={showForm}
        onClose={() => { setShowForm(false); setEditingTask(null); setTaskDefaults(null); }}
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

      <EntityDetailPanel
        type="task"
        taskId={viewingTaskId}
        open={viewingTaskId !== null}
        onClose={() => setViewingTaskId(null)}
        onUpdated={handleTaskUpdated}
      />

      <EntityDetailPanel
        type="project"
        projectId={viewingProjectId}
        open={viewingProjectId !== null}
        onClose={() => setViewingProjectId(null)}
        onUpdated={handleTaskUpdated}
      />

      <TaskCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

      <ProjectFormModal
        open={showProject}
        onClose={() => setShowProject(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
