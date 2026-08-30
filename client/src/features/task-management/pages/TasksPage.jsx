import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Clock, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useNotifications } from '@/shared/stores/notificationStore.js';
import { useTasks } from '../hooks/useTasks';
import { updateProgress, bulkUpdateTasks, bulkDeleteTasks } from '../services/taskService';
import { getProjects, getProjectTree, updateProject } from '../services/projectService';
import { updateClient } from '../api/client.api';
import { updateBusiness } from '../api/business.api';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import EntityDetailPanel from '../components/EntityDetailPanel';
import BulkActionBar from '../components/BulkActionBar';
import TaskForm from '../components/TaskForm';
import { deleteClient, deleteClientBusiness } from '../api/client.api';
import { deleteProject } from '../services/projectService';
import api from '@/services/api';
import ProjectTaskViews, { TASK_VIEWS, TASK_VIEW_KEYS } from '../components/ProjectTaskViews';
import ViewTabs from '../components/ViewTabs';
import SavedViewChips from '../components/SavedViewChips';
import FilterBar from '@/shared/components/ui/FilterBar';
import Breadcrumb from '../components/Breadcrumb';
import QuickCreateMenu from '../components/QuickCreateMenu';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';

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
  const { markEntityTypeRead } = useNotifications();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const clientParam = searchParams.get('client');
  const businessParam = searchParams.get('business');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [activeViewKey, setActiveViewKey] = useState('all');

  useEffect(() => {
    markEntityTypeRead('task');
  }, [markEntityTypeRead]);

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
  const [viewingClientId, setViewingClientId] = useState(null);
  const [viewingBusinessId, setViewingBusinessId] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'list');
  const [, setTaskDefaults] = useState(undefined);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const toggleSelect = useCallback((id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllIds = useCallback((ids) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // All projects, keyed by id, used for hierarchy grouping and scope prefill.
  // clientTree holds the full Client -> Business skeleton (including businesses
  // that have no projects yet) so newly created ones still appear in the table.
  const [projectsById, setProjectsById] = useState({});
  const [clientTree, setClientTree] = useState([]);
  const loadProjects = useCallback(() => {
    let active = true;
    Promise.all([getProjects(), getProjectTree()])
      .then(([projData, treeData]) => {
        if (!active) return;
        const arr = Array.isArray(projData) ? projData : (projData?.rows || []);
        const map = {};
        arr.forEach((p) => { map[String(p.id)] = p; });
        setProjectsById(map);
        setClientTree(Array.isArray(treeData) ? treeData : (treeData?.rows || []));
      })
      .catch(() => {})
      .finally(() => { active = false; });
  }, []);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const renameProject = useCallback(async (id, name) => {
    try {
      await updateProject(id, { name });
      toast.success('Project renamed');
      loadProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to rename project');
    }
  }, [toast, loadProjects]);

  const renameClient = useCallback(async (id, name) => {
    try {
      await updateClient(id, { client_name: name });
      toast.success('Client renamed');
      loadProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to rename client');
    }
  }, [toast, loadProjects]);

  const renameBusiness = useCallback(async (id, name) => {
    try {
      await updateBusiness(id, { business_name: name });
      toast.success('Business renamed');
      loadProjects();
    } catch (err) {
      toast.error(err.message || 'Failed to rename business');
    }
  }, [toast, loadProjects]);

  const renameTask = useCallback(async (id, title) => {
    try {
      await update(id, { title });
    } catch (err) {
      toast.error(err.message || 'Failed to rename task');
    }
  }, [update, toast]);

  // Inline create handlers for the hierarchy table's "+" buttons (client -> business,
  // business -> project). These create the entity by name only and refresh the tree;
  // no modal is opened.
  const handleCreateBusiness = useCallback(async (clientId, name) => {
    try {
      await api.post(`/clients/${clientId}/businesses`, { business_name: name.trim() });
      toast.success('Business created');
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create business');
      throw err;
    }
  }, [toast, loadProjects]);

  const handleCreateProject = useCallback(async (businessId, name) => {
    try {
      await api.post('/projects', {
        client_business_id: parseInt(businessId, 10),
        name: name.trim(),
      });
      toast.success('Project created');
      loadProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
      throw err;
    }
  }, [toast, loadProjects]);

  // The hierarchy's "business" node is a client_businesses row (built from the
  // project tree), so deleting it must hit the client-business endpoint, not the
  // unrelated `businesses` table endpoint. Resolve the owning client id here.
  const findClientIdForBusiness = useCallback((id) => {
    for (const client of clientTree || []) {
      const match = (client.businesses || []).find((b) => String(b.id) === String(id));
      if (match) return client.id;
    }
    return null;
  }, [clientTree]);

  const handleDeleteEntity = useCallback(async (kind, id) => {
    try {
      if (kind === 'client') await deleteClient(id);
      else if (kind === 'business') {
        const clientId = findClientIdForBusiness(id);
        if (clientId == null) throw new Error('Could not resolve the owning client for this business');
        await deleteClientBusiness(clientId, id);
      } else if (kind === 'project') await deleteProject(id);
      toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} deleted`);
      loadProjects();
      refreshTasks();
    } catch (err) {
      toast.error(err.message || `Failed to delete ${kind}`);
    }
  }, [toast, loadProjects, refreshTasks, findClientIdForBusiness]);

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

  const handleQuickAddTask = useCallback(async (projectId, title) => {
    const project = projectsById[String(projectId)];
    if (!project) return;
    // New tasks default to "Not Started" (status = 'Pending'); priority, due
    // date, and assignee are left empty so they can be set afterwards.
    const payload = {
      title,
      status: 'Pending',
      client_id: project.client_id,
      client_business_id: project.client_business_id,
      project_id: project.id,
      assignments: [],
    };
    try {
      await create(payload);
      await refreshStats();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
    }
  }, [projectsById, create, refreshStats, toast]);

  const handleProjectCreated = (project) => {
    if (project?.id && project?.client_id) {
      navigate(`/clients/${project.client_id}/businesses/${project.client_business_id}/projects/${project.id}`);
    }
  };

  // Keyboard shortcut: N opens the quick-add task form (Cmd/Ctrl+K palette is
  // now global, owned by the app shell).
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      if (!typing && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
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

  // When a client or business scope is active, restrict the Client -> Business
  // skeleton so the hierarchy tree renders only the selected branch (matching the
  // scoped tasks/projects). Without this the tree still seeded every client from
  // the full org tree, so the scope only auto-expanded instead of filtering.
  const scopedClientTree = useMemo(() => {
    if (!clientParam && !businessParam) return clientTree;
    return (clientTree || [])
      .map((client) => {
        if (clientParam && String(client.id) !== String(clientParam)) return null;
        if (businessParam) {
          const businesses = (client.businesses || []).filter(
            (b) => String(b.id) === String(businessParam)
          );
          return { ...client, businesses };
        }
        return client;
      })
      .filter(Boolean);
  }, [clientTree, clientParam, businessParam]);

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

  const runBulk = useCallback(async (fn, successMsg) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await fn(ids);
      await refreshTasks();
      await refreshStats();
      toast.success(successMsg);
      clearSelection();
    } catch (err) {
      toast.error(err.message || 'Bulk action failed');
    }
  }, [selectedIds, refreshTasks, refreshStats, toast, clearSelection]);

  const handleBulkStatus = useCallback((status) => runBulk(
    (ids) => bulkUpdateTasks(ids, { status }),
    `${selectedIds.size} task(s) updated to ${status}`
  ), [runBulk, selectedIds.size]);

  const handleBulkPriority = useCallback((priority) => runBulk(
    (ids) => bulkUpdateTasks(ids, { priority }),
    `${selectedIds.size} task(s) set to ${priority} priority`
  ), [runBulk, selectedIds.size]);

  const handleBulkAssignee = useCallback((assignments) => runBulk(
    (ids) => bulkUpdateTasks(ids, { assignments }),
    `${selectedIds.size} task(s) reassigned`
  ), [runBulk, selectedIds.size]);

  const handleBulkDelete = useCallback(() => runBulk(
    (ids) => bulkDeleteTasks(ids),
    `${selectedIds.size} task(s) deleted`
  ), [runBulk, selectedIds.size]);

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

  if (!isAnyAdmin) {
    return null;
  }

  return (
    <div className="ppm max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Tasks &amp; Projects
          </h1>
          <p className="text-xs text-[var(--ppm-text-muted)] mt-0.5">Create, assign, and monitor tasks</p>
        </div>
        <QuickCreateMenu clientId={clientParam ? Number(clientParam) : undefined} onProjectCreated={handleProjectCreated} />
      </div>

      {(clientParam || businessParam) && (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <Breadcrumb
            items={[
              clientParam
                ? { label: filteredClientName || 'Client', onClick: () => setViewingClientId(Number(clientParam)) }
                : null,
              businessParam
                ? { label: filteredBusinessName || 'Business', onClick: () => setViewingBusinessId(Number(businessParam)) }
                : null,
            ].filter(Boolean)}
          />
          <button
            onClick={() => navigate('/tasks')}
            className="text-[var(--color-primary)] hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Summary — condensed strip, not a competing block of tiles */}
      {stats && (
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

      {/* View type — a distinct control from filters/saved views */}
      <ViewTabs views={TASK_VIEWS} active={view} onChange={changeView} />

      {/* Saved filter presets — visually separate from view type */}
      <div className="mb-3">
        <SavedViewChips views={SAVED_VIEWS} activeKey={activeViewKey} onApply={applySavedView} />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatus={setStatusFilter}
        statusOptions={TASK_STATUSES}
        priorityFilter={priorityFilter}
        onPriority={setPriorityFilter}
        priorityOptions={TASK_PRIORITIES}
        assigneeFilter={assigneeFilter}
        onAssignee={setAssigneeFilter}
        assigneeOptions={assigneeOptions}
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
          clientTree={scopedClientTree}
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
          hideTabs
          onQuickAddTask={handleQuickAddTask}
          onRenameClient={renameClient}
          onRenameBusiness={renameBusiness}
          onRenameProject={renameProject}
          onRenameTask={renameTask}
          onCreateBusiness={handleCreateBusiness}
          onCreateProject={handleCreateProject}
          onDeleteEntity={handleDeleteEntity}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAllIds}
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
        onOpenTask={(id) => setViewingTaskId(id)}
      />

      <EntityDetailPanel
        type="project"
        projectId={viewingProjectId}
        open={viewingProjectId !== null}
        onClose={() => setViewingProjectId(null)}
        onUpdated={handleTaskUpdated}
      />

      <EntityDetailPanel
        type="client"
        clientId={viewingClientId}
        open={viewingClientId !== null}
        onClose={() => setViewingClientId(null)}
        onUpdated={loadProjects}
        onDeleted={loadProjects}
      />

      <EntityDetailPanel
        type="business"
        businessId={viewingBusinessId}
        open={viewingBusinessId !== null}
        onClose={() => setViewingBusinessId(null)}
        onUpdated={loadProjects}
        onDeleted={loadProjects}
      />

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onStatusChange={handleBulkStatus}
          onPriorityChange={handleBulkPriority}
          onAssigneeChange={handleBulkAssignee}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}
