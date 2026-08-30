import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getProject } from '../services/projectService';
import { getTasks, createTask, updateTask, deleteTask, updateProgress } from '../services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/components/ui/Toast';
import Breadcrumb from '../components/Breadcrumb';
import ProjectTaskViews from '../components/ProjectTaskViews';
import EntityDetailPanel from '../components/EntityDetailPanel';
import TaskForm from '../components/TaskForm';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';

const STORAGE_KEY = (id) => `ppm:last-view:${id}`;

export default function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const { isAnyAdmin } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proj, taskData] = await Promise.all([
        getProject(projectId),
        getTasks({ project_id: projectId, limit: 200 }),
      ]);
      setProject(proj);
      setTasks(taskData?.rows || []);
      const views = proj.enabled_views || ['list'];
      if (!views.includes(localStorage.getItem(STORAGE_KEY(projectId)) || 'list')) {
        localStorage.setItem(STORAGE_KEY(projectId), 'list');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load project');
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { load(); }, [load]);

  const openTask = useCallback((t) => {
    setSelected(t);
    setPanelOpen(true);
  }, []);

  const handleEdit = useCallback((task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id) => setPendingDeleteId(id), []);

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    try {
      await deleteTask(pendingDeleteId);
      toast.success('Task deleted');
      setTasks((prev) => prev.filter((t) => t.id !== pendingDeleteId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleStatusChange = useCallback(async (task, newStatus) => {
    const changes = { status: newStatus };
    if (newStatus === 'Completed') changes.completion_rate = 100;
    try {
      await updateProgress({ task_id: task.id, ...changes });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...changes } : t)));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  }, [toast]);

  const handleProgressChange = useCallback(async (taskId, rate) => {
    const changes = { progress_rate: rate };
    if (rate === 100) changes.status = 'Completed';
    try {
      await updateProgress({ task_id: taskId, ...changes });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...changes } : t)));
    } catch (err) {
      toast.error(err.message || 'Failed to update progress');
    }
  }, [toast]);

  const handleInlineUpdate = useCallback(async (task, changes) => {
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
      await updateTask(task.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...changes } : t)));
    } catch (err) {
      toast.error(err.message || 'Failed to update task');
    }
  }, [toast]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, payload);
        toast.success('Task updated');
      } else {
        await createTask({ ...payload, project_id: projectId });
        toast.success('Task created');
      }
      setShowForm(false);
      setEditingTask(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  // Build a projects map for the hierarchy/list view so the project's
  // client -> business -> project tree resolves (and shows its tasks).
  const projectsById = useMemo(
    () => (project ? { [String(project.id)]: project } : {}),
    [project]
  );

  const taskDefaults = useMemo(
    () => (project ? {
      client_id: project.client_id,
      client_business_id: project.client_business_id,
      project_id: project.id,
    } : undefined),
    [project]
  );

  if (loading) return <p className="text-sm text-[var(--ppm-text-muted)]">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!project) return <p className="text-sm text-[var(--ppm-text-muted)]">Project not found.</p>;

  const views = project.enabled_views || ['list'];

  const breadcrumbItems = [
    { label: 'Clients', to: '/clients' },
    project.client_id && { label: project.client_name, to: `/clients/${project.client_id}` },
    project.client_business_id && {
      label: project.client_business_name,
      to: `/clients/${project.client_id}/businesses/${project.client_business_id}`,
    },
    { label: project.name },
  ].filter(Boolean);

  return (
    <div className="ppm max-w-6xl mx-auto">
      <Breadcrumb items={breadcrumbItems} className="mb-3" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color || 'var(--color-primary)' }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-[var(--text-primary)]">{project.name}</h1>
            <p className="text-sm text-[var(--ppm-text-muted)]">{project.task_count || tasks.length} tasks</p>
          </div>
        </div>
        {isAnyAdmin && (
          <button
            onClick={() => { setEditingTask(null); setShowForm(true); }}
            className="ppm-btn-primary shrink-0"
          >
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      {loading && tasks.length === 0 ? (
        <p className="text-sm text-[var(--ppm-text-muted)]">Loading tasks…</p>
      ) : (
        <ProjectTaskViews
          tasks={tasks}
          loading={loading}
          projectsById={projectsById}
          canManage={isAnyAdmin}
          storageKey={STORAGE_KEY(projectId)}
          activeViews={views}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onInlineUpdate={handleInlineUpdate}
          onViewTask={openTask}
          onView={openTask}
          projectScoped
          onQuickCreate={async (title) => {
            try {
              await createTask({ title, project_id: projectId });
              toast.success('Task added');
              load();
            } catch (err) {
              toast.error(err.message || 'Failed to add task');
            }
          }}
          onCreateTask={() => { setEditingTask(null); setShowForm(true); }}
        />
      )}

      {selected && (
        <EntityDetailPanel
          type="task"
          taskId={selected?.id}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onUpdated={(updated) => {
            setSelected(updated);
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
          onOpenTask={(id) => { setSelected({ id }); setPanelOpen(true); }}
        />
      )}

      <TaskForm
        show={showForm}
        onClose={() => { setShowForm(false); setEditingTask(null); }}
        onSubmit={handleSubmit}
        saving={saving}
        initialData={editingTask}
        defaultValues={taskDefaults}
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
    </div>
  );
}
