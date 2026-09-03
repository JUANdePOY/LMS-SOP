import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Clock, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import { useNotifications } from '@/shared/stores/notificationStore.js';
import { useTasks } from '../hooks/useTasks';
import { updateProgress, bulkUpdateTasks, bulkDeleteTasks } from '../services/taskService';
import { getProjects, getProjectTree, updateProject } from '../services/projectService';
import { createClient, updateClient } from '../api/client.api';
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
import FilterBar from '@/shared/components/ui/FilterBar';
import Breadcrumb from '../components/Breadcrumb';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import { notifyOrgTreeChanged, useOrgTreeVersion } from '@/shared/store/orgTreeBus';
import ClientFormModal from '../components/ClientFormModal';

const VIEW_STORAGE_KEY = 'ppm:tasks:view';


export default function TasksPage() {
  const { isAnyAdmin, isDepartmentHead, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { markEntityTypeRead } = useNotifications();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const clientParam = searchParams.get('client');
  const businessParam = searchParams.get('business');
  const projectParam = searchParams.get('project');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

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
  const [focusSubtasks, setFocusSubtasks] = useState(false);
  const [viewingProjectId, setViewingProjectId] = useState(null);
  const [viewingClientId, setViewingClientId] = useState(null);
  const [viewingBusinessId, setViewingBusinessId] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'list');
  const [taskDefaults, setTaskDefaults] = useState(undefined);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showAddClient, setShowAddClient] = useState(false);

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

  const [projectsById, setProjectsById] = useState({});
  const [clientTree, setClientTree] = useState([]);
  const orgVersion = useOrgTreeVersion();
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
  useEffect(() => { loadProjects(); }, [loadProjects, orgVersion]);

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

  const handleCreateBusiness = useCallback(async (clientId, name) => {
    try {
      await api.post(`/clients/${clientId}/businesses`, { business_name: name.trim() });
      toast.success('Business created');
      loadProjects();
      notifyOrgTreeChanged();
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
      notifyOrgTreeChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
      throw err;
    }
  }, [toast, loadProjects]);

  const handleCreateClient = useCallback(async (name, businessId = null) => {
    try {
      await createClient({ client_name: name.trim(), business_id: businessId || null });
      toast.success('Client created');
      loadProjects();
      notifyOrgTreeChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create client');
      throw err;
    }
  }, [toast, loadProjects]);

  const findClientIdForBusiness = useCallback((id) => {
    for (const client of clientTree || []) {
      const match = (client.businesses || []).find((b) => String(b.id) === String(id));
      if (match) return client.id;
    }
    return null;
  }, [clientTree]);

  const handleDeleteEntity = useCallback(async (kind, id) => {
    if (id == null || (typeof id === 'number' && !Number.isFinite(id))) {
      toast.error(`Invalid ${kind} ID — cannot delete.`);
      return;
    }
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
      notifyOrgTreeChanged();
    } catch (err) {
      toast.error(err.message || `Failed to delete ${kind}`);
    }
  }, [toast, loadProjects, refreshTasks, findClientIdForBusiness]);

  const scopeDefaults = useMemo(() => {
    if (!clientParam && !businessParam) return undefined;
    const defaults = {};
    if (clientParam) defaults.client_id = clientParam;
    if (clientParam && businessParam) defaults.client_business_id = businessParam;
    return defaults;
  }, [clientParam, businessParam]);

  const changeView = useCallback((next) => {
    setView(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  }, []);

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

  const handleQuickAddTask = useCallback(async (businessId, clientId, payload) => {
    const base = {
      title: payload.title,
      status: payload.status || 'Pending',
      priority: payload.priority || 'Medium',
      assignments: Array.isArray(payload.assignments) ? payload.assignments : [],
    };
    if (payload.deadline_datetime != null && payload.deadline_datetime !== '') {
      base.deadline_datetime = payload.deadline_datetime;
    }
    if (payload.client_id != null && payload.client_id !== '' && payload.client_id !== undefined) {
      base.client_id = Number(payload.client_id);
    }
    if (payload.client_business_id != null && payload.client_business_id !== '' && payload.client_business_id !== undefined) {
      base.client_business_id = Number(payload.client_business_id);
    }
    try {
      await create(base);
      await refreshTasks();
      await refreshStats();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
    }
  }, [create, refreshTasks, refreshStats, toast]);

  const handleQuickAddSubtask = useCallback(async (parentTaskId, title) => {
    const parent = tasks.find((t) => String(t.id) === String(parentTaskId));
    const payload = {
      title,
      status: 'Pending',
      parent_task_id: Number(parentTaskId),
      assignments: [],
    };
    if (parent?.client_id != null) payload.client_id = Number(parent.client_id);
    if (parent?.client_business_id != null) payload.client_business_id = Number(parent.client_business_id);
    try {
      await create(payload);
      await refreshTasks();
      await refreshStats();
    } catch (err) {
      toast.error(err.message || 'Failed to create sub-task');
    }
  }, [tasks, create, refreshTasks, refreshStats, toast]);

  const handleProjectCreated = (project) => {
    if (project?.id && project?.client_id) {
      navigate(`/clients/${project.client_id}/businesses/${project.client_business_id}/projects/${project.id}`);
    }
  };

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

  const assigneeOptions = useMemo(() => {
    const seen = new Set();
    (tasks || []).forEach((t) => (t.assignments || []).forEach((a) => {
      if (a.reference_name) seen.add(a.reference_name);
    }));
    return [...seen].sort();
  }, [tasks]);

  const scopedClientIdsForBusiness = useMemo(() => {
    if (!businessParam || clientParam || projectParam) return null;
    return new Set(
      (clientTree || [])
        .filter((c) => c.business_id != null && String(c.business_id) === String(businessParam))
        .map((c) => String(c.id))
    );
  }, [clientTree, businessParam, clientParam, projectParam]);

  const displayedTasks = useMemo(() => {
    let result = tasks || [];
    const taskClientId = (t) => {
      const pid = t.project_id ?? t.projectId ?? t.project?.id;
      const proj = pid != null ? projectsById[String(pid)] : null;
      if (proj) return { clientId: proj.client_id, businessId: proj.client_business_id };
      if (t.client_id != null || t.client_business_id != null) {
        return { clientId: t.client_id ?? null, businessId: t.client_business_id ?? null };
      }
      return null;
    };
    if (user?.role === 'admin' && user?.business_id != null) {
      const adminBizId = String(user.business_id);
      const adminClientIds = new Set(
        (clientTree || [])
          .filter((c) => c.business_id != null && String(c.business_id) === adminBizId)
          .map((c) => String(c.id))
      );
      result = result.filter((t) => {
        if (t.business_id != null && String(t.business_id) === adminBizId) return true;
        const scope = taskClientId(t);
        if (scope?.clientId != null && adminClientIds.has(String(scope.clientId))) return true;
        return false;
      });
    }
    if (isDepartmentHead && user?.department_id != null) {
      const deptId = String(user.department_id);
      const sopBizId = user?.department_business_id != null || user?.business_id != null
        ? String(user.department_business_id ?? user.business_id)
        : null;
      const deptClientIds = new Set(
        (clientTree || [])
          .filter((c) => {
            if (sopBizId != null && String(c.business_id) !== sopBizId) return false;
            if (String(c.department_id) !== deptId) return false;
            return true;
          })
          .map((c) => String(c.id))
      );
      result = result.filter((t) => {
        if ((t.assignments || []).some(
          (a) => a.assignment_type === 'Department' && String(a.reference_id) === deptId
        )) return true;
        const scope = taskClientId(t);
        if (scope?.clientId != null && deptClientIds.has(String(scope.clientId))) return true;
        return false;
      });
    }
    if (clientParam) {
      result = result.filter((t) => String(taskClientId(t)?.clientId) === String(clientParam));
    }
    if (businessParam) {
      if (!clientParam && !projectParam && scopedClientIdsForBusiness) {
        result = result.filter((t) => {
          const scope = taskClientId(t);
          return scope?.clientId != null && scopedClientIdsForBusiness.has(String(scope.clientId));
        });
      } else {
        result = result.filter((t) => String(taskClientId(t)?.businessId) === String(businessParam));
      }
    }
    if (projectParam) {
      result = result.filter((t) => String(t.project_id ?? t.projectId ?? t.project?.id) === String(projectParam));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter) {
      result = result.filter((t) => t.priority === priorityFilter);
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
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, user, clientParam, businessParam, projectsById, scopedClientIdsForBusiness, isDepartmentHead, clientTree]);

  const STAT_ACCENTS = {
    Total: 'var(--ppm-text)',
    Pending: '#3b82f6',
    'In Progress': '#3b82f6',
    Completed: '#10b981',
    Overdue: '#ef4444',
    Cancelled: '#94a3b8',
  };

  const statItems = useMemo(() => {
    const list = displayedTasks || [];
    const total = list.length;
    const pending = list.filter((t) => t.status === 'Pending').length;
    const inProgress = list.filter((t) => t.status === 'In Progress').length;
    const completed = list.filter((t) => t.status === 'Completed').length;
    const overdue = list.filter((t) => t.status === 'Overdue').length;
    const cancelled = list.filter((t) => t.status === 'Cancelled').length;
    return [
      { label: 'Total', value: total, icon: ClipboardList, accent: STAT_ACCENTS.Total },
      { label: 'Pending', value: pending, icon: Clock, accent: STAT_ACCENTS.Pending },
      { label: 'In Progress', value: inProgress, icon: RefreshCw, accent: STAT_ACCENTS['In Progress'] },
      { label: 'Completed', value: completed, icon: CheckCircle, accent: STAT_ACCENTS.Completed },
      { label: 'Overdue', value: overdue, icon: AlertTriangle, accent: STAT_ACCENTS.Overdue },
      { label: 'Cancelled', value: cancelled, icon: XCircle, accent: STAT_ACCENTS.Cancelled },
    ];
  }, [displayedTasks]);

  const hasActiveFilters = search || statusFilter || priorityFilter || assigneeFilter;

  const filteredClientName = useMemo(() => {
    if (!clientParam) return null;
    const p = Object.values(projectsById).find((x) => String(x.client_id) === String(clientParam));
    return p?.client_name || null;
  }, [clientParam, projectsById, projectParam]);

  const filteredBusinessName = useMemo(() => {
    if (!businessParam) return null;
    if (!clientParam) {
      const match = (clientTree || []).find(
        (c) => c.business_id != null && String(c.business_id) === String(businessParam)
      );
      return match?.business_name || null;
    }
    const p = Object.values(projectsById).find((x) => String(x.client_business_id) === String(businessParam));
    return p?.client_business_name || null;
  }, [businessParam, clientParam, projectsById, clientTree, projectParam]);

  const scopedProjectsById = useMemo(() => {
    if (user?.role === 'admin' && user?.business_id != null && !clientParam && !businessParam && !projectParam) {
      const adminBizId = String(user.business_id);
      const validClientIds = new Set(
        (clientTree || [])
          .filter((c) => c.business_id != null && String(c.business_id) === adminBizId)
          .map((c) => String(c.id))
      );
      const scoped = {};
      for (const p of Object.values(projectsById)) {
        if (p.client_id != null && validClientIds.has(String(p.client_id))) {
          scoped[String(p.id)] = p;
        }
      }
      return scoped;
    }
    if (isDepartmentHead && (user?.department_business_id != null || user?.business_id != null) && !clientParam && !businessParam && !projectParam) {
      const sopBizId = String(user.department_business_id ?? user.business_id);
      const deptId = user?.department_id != null ? String(user.department_id) : null;
      const validClientIds = new Set(
        (clientTree || [])
          .filter((c) => {
            if (String(c.business_id) !== sopBizId) return false;
            if (deptId != null && String(c.department_id) !== deptId) return false;
            return true;
          })
          .map((c) => String(c.id))
      );
      const scoped = {};
      for (const p of Object.values(projectsById)) {
        if (p.client_id != null && validClientIds.has(String(p.client_id))) {
          scoped[String(p.id)] = p;
        }
      }
      return scoped;
    }
    if (!clientParam && !businessParam && !projectParam) return projectsById;
    const scoped = {};
    const clientBusinessIdsForSopBusiness = (() => {
      if (!businessParam || clientParam || projectParam) return null;
      const ids = new Set();
      for (const client of clientTree || []) {
        if (client.business_id != null && String(client.business_id) === String(businessParam)) {
          for (const b of client.businesses || []) ids.add(String(b.id));
        }
      }
      return ids;
    })();
    Object.values(projectsById).forEach((p) => {
      if (projectParam) {
        if (String(p.id) === String(projectParam)) scoped[String(p.id)] = p;
      } else if (businessParam && !clientParam && clientBusinessIdsForSopBusiness) {
        if (p.client_business_id != null && clientBusinessIdsForSopBusiness.has(String(p.client_business_id))) {
          scoped[String(p.id)] = p;
        }
      } else if (businessParam && String(p.client_business_id) === String(businessParam)) {
        scoped[String(p.id)] = p;
      } else if (clientParam && String(p.client_id) === String(clientParam)) {
        scoped[String(p.id)] = p;
      }
    });
    return scoped;
  }, [projectsById, clientParam, businessParam, projectParam, clientTree, isDepartmentHead, user]);

  const scopedClientTree = useMemo(() => {
    if (user?.role === 'admin' && user?.business_id != null) {
      const adminBizId = String(user.business_id);
      return (clientTree || []).filter(
        (c) => c.business_id != null && String(c.business_id) === adminBizId
      );
    }
    if (isDepartmentHead && (user?.department_business_id != null || user?.business_id != null)) {
      const sopBizId = String(user.department_business_id ?? user.business_id);
      const deptId = user?.department_id != null ? String(user.department_id) : null;
      return (clientTree || []).filter((c) => {
        if (String(c.business_id) !== sopBizId) return false;
        if (deptId != null && String(c.department_id) !== deptId) return false;
        return true;
      });
    }
    if (!clientParam && !businessParam && !projectParam) return clientTree;
    const targetClient = clientParam ?? (projectParam ? projectsById[String(projectParam)]?.client_id : null);
    const targetBusiness = projectParam ? projectsById[String(projectParam)]?.client_business_id : null;
    return (clientTree || [])
      .map((client) => {
        if (targetClient && String(client.id) !== String(targetClient)) return null;
        if (businessParam && !clientParam && !projectParam) {
          if (client.business_id == null || String(client.business_id) !== String(businessParam)) return null;
          return client;
        }
        if (targetBusiness) {
          const businesses = (client.businesses || []).filter(
            (b) => String(b.id) === String(targetBusiness)
          );
          return { ...client, businesses };
        }
        return client;
      })
      .filter(Boolean);
  }, [clientTree, clientParam, businessParam, projectParam, projectsById, isDepartmentHead, user]);

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
    try {
      await remove(pendingDeleteId);
      if (viewingTaskId != null && String(viewingTaskId) === String(pendingDeleteId)) {
        setViewingTaskId(null);
        setFocusSubtasks(false);
      }
      setPendingDeleteId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  const deleteTaskNow = useCallback(async (id) => {
    try {
      await remove(id);
      if (viewingTaskId != null && String(viewingTaskId) === String(id)) {
        setViewingTaskId(null);
        setFocusSubtasks(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  }, [remove, toast, viewingTaskId]);

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
  ), [runBulk]);

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
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Tasks &amp; Projects
          </h1>
          <p className="text-xs text-[var(--ppm-text-muted)] mt-0.5">Create, assign, and monitor tasks</p>
        </div>
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

      {stats && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--ppm-border)]/5 pb-3 text-xs text-[var(--ppm-text-muted)]">
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

      <ViewTabs views={TASK_VIEWS} active={view} onChange={changeView} />

      <FilterBar
        className="mb-3"
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
          userDepartmentId={user?.department_id ?? null}
          userRole={user?.role ?? ''}
          userBusinessId={user?.business_id ?? null}
          userDepartmentBusinessId={user?.department_business_id ?? null}
          scopeClientId={clientParam}
          scopeBusinessId={businessParam}
          scopeProjectId={projectParam}
          viewProp={view}
          onViewChange={changeView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onInlineUpdate={handleInlineUpdate}
          onViewTask={(task) => { setFocusSubtasks(false); setViewingTaskId(task.id); }}
          onView={(task) => setViewingTaskId(task.id)}
          onViewSubtasks={(task) => { setFocusSubtasks(true); setViewingTaskId(task.id); }}
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
          onQuickAddSubtask={handleQuickAddSubtask}
          onRenameClient={renameClient}
          onRenameBusiness={renameBusiness}
          onRenameProject={renameProject}
          onRenameTask={renameTask}
          onCreateBusiness={handleCreateBusiness}
          onCreateProject={handleCreateProject}
          onCreateClient={handleCreateClient}
          onDeleteEntity={handleDeleteEntity}
        />
      )}

      <TaskForm
        show={showForm}
        onClose={() => { setShowForm(false); setEditingTask(null); setTaskDefaults(null); }}
        onSubmit={handleSubmit}
        saving={saving}
        initialData={editingTask}
        defaultValues={taskDefaults}
        userDepartmentId={user?.department_id ?? null}
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
        onClose={() => { setViewingTaskId(null); setFocusSubtasks(false); }}
        onUpdated={handleTaskUpdated}
        onOpenTask={(id) => { setFocusSubtasks(false); setViewingTaskId(id); }}
        focusSubtasks={focusSubtasks}
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
