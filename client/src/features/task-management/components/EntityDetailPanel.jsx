import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User as UserIcon, MessageSquare, Paperclip, TrendingUp, Loader2 } from 'lucide-react';
import Drawer from '@/shared/components/ui/Drawer';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/shared/components/ui/Avatar';
import PriorityFlag from './PriorityFlag';
import { updateTask, getTask, createTask, deleteTask } from '../services/taskService';
import { getProject, updateProject, deleteProject } from '../services/projectService';
import { getClient, updateClient, deleteClient } from '../api/client.api';
import { getBusiness, updateBusiness, deleteBusiness } from '../api/business.api';
import { useToast } from '@/shared/components/ui/Toast';
import { useTaskDetails } from '../hooks/useTaskDetails';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import { formatDateTime, toLocalInputValue } from '../utils/taskDateUtils';
import AttachmentSection from './AttachmentSection';
import CommentSection from './CommentSection';
import ProgressModal from './ProgressModal';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';
import SubtaskList from './SubtaskList';
import { AssigneePicker } from './TaskListRow';

const ENTITY_LABEL = {
  task: 'Task',
  project: 'Project',
  business: 'Business',
  client: 'Client',
};

const STATUS_COLORS = {
  Pending: 'var(--ppm-status-pending)',
  'In Progress': 'var(--ppm-status-progress)',
  Completed: 'var(--ppm-status-completed)',
  Overdue: 'var(--ppm-status-overdue)',
  Cancelled: 'var(--ppm-status-cancelled)',
};
const STATUS_BG = {
  Pending: 'var(--ppm-status-pending-bg)',
  'In Progress': 'var(--ppm-status-progress-bg)',
  Completed: 'var(--ppm-status-completed-bg)',
  Overdue: 'var(--ppm-status-overdue-bg)',
  Cancelled: 'var(--ppm-status-cancelled-bg)',
};

function Pill({ label, color, bg }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</label>
      <div className="text-sm text-[var(--text-primary)]">{children}</div>
    </div>
  );
}

function EditableDate({ label, value, disabled, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</label>
      <input
        type="datetime-local"
        value={toLocalInputValue(value) || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
      />
    </div>
  );
}

// Returns true when the given user is allowed to update progress, attach files,
// and comment on a task: they must be assigned (directly, or via a department /
// position assignment) or be an admin.
function isUserAssigned(assignments, user) {
  if (!Array.isArray(assignments) || !user) return false;
  return assignments.some((a) => {
    if (a.assignment_type === 'User') return String(a.reference_id) === String(user.id);
    if (a.assignment_type === 'Department') return String(a.reference_id) === String(user.department_id);
    if (a.assignment_type === 'Position') return Boolean(a.reference_id) && a.reference_id === user.position_title;
    return false;
  });
}

function TaskBody({ taskId, open, onUpdated, onOpenTask, focusSubtasks = false, readOnly = false }) {
  const { toast } = useToast();
  const { user, isAnyAdmin, isDepartmentHead } = useAuth();
  const [local, setLocal] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [pendingAttachmentId, setPendingAttachmentId] = useState(null);
  const [pendingSubtaskId, setPendingSubtaskId] = useState(null);
  const { task, loading, error, saving, load, updateProgress, addComment: postComment, uploadFile, removeAttachment } = useTaskDetails(taskId);

  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => { if (task) setLocal(task); }, [task]);

  const patch = async (payload) => {
    try {
      await updateTask(taskId, payload);
      await load();
      onUpdated?.(await getTask(taskId));
    } catch (err) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  const buildSubtaskPayload = (parentId, title) => ({
    title: title.trim(),
    parent_task_id: parentId,
    status: 'Pending',
    priority: 'Medium',
    start_datetime: local.start_datetime || null,
    deadline_datetime: local.deadline_datetime || null,
    estimated_hours: 1,
    client_id: local.client_id ?? null,
    client_business_id: local.client_business_id ?? null,
    business_id: local.business_id ?? null,
    project_id: local.project_id ?? null,
    assignments: [],
  });

  const handleAddSubtask = async (parentId, title) => {
    const pid = parentId ?? taskId;
    try {
      await createTask(buildSubtaskPayload(pid, title));
      toast.success('Sub-task added');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to add sub-task');
      throw err;
    }
  };

  const handleToggleSubtask = async (id, next) => {
    try {
      await updateTask(id, { status: next });
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to update sub-task');
    }
  };

  const handleAssignSubtask = async (subtaskId, userList) => {
    try {
      await updateTask(subtaskId, { assignments: userList });
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to assign sub-task');
    }
  };

  const handleDeleteSubtask = async () => {
    const id = pendingSubtaskId;
    setPendingSubtaskId(null);
    try {
      await deleteTask(id);
      toast.success('Sub-task deleted');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete sub-task');
    }
  };

  if (!open) return null;
  if (loading && !local) {
    return <div className="flex flex-col items-center gap-2 py-12 text-sm text-[var(--text-muted)]"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-blue-500" />Loading…</div>;
  }
  if (error && !local) return <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</div>;
  if (!local) return <div className="text-sm text-[var(--text-muted)]">Task not found.</div>;

  const userAssignees = (local.assignments || []).filter((a) => a.assignment_type === 'User');
  const teamAssignees = (local.assignments || []).filter((a) => a.assignment_type === 'Department');

  // Mirror the hierarchy/list: show the derived auto status (e.g. "Overdue" for a
  // Pending task past its deadline) rather than the raw stored value, so the
  // drawer and the table agree. The <select> below still edits the stored status.
  const displayStatus = local.auto_status ?? local.status;

  // Only admins and Department Heads may edit task details (title, status,
  // priority, dates, description, assignees, sub-tasks). Regular assignees can
  // still message, upload attachments, and update progress — but only when they
  // are assigned to the task itself. When readOnly is forced (employee viewing
  // an unassigned task), everything is view-only.
  const canEdit = !readOnly && isAnyAdmin;
  const isAssigned = !readOnly && (isAnyAdmin || isUserAssigned(local.assignments, user));

  // Save only the user picks, but preserve any team/department assignments that
  // the picker doesn't manage so they aren't lost on update.
  const handleAssigneesSave = (userList) => {
    const teams = (local.assignments || []).filter((a) => a.assignment_type !== 'User');
    patch({ assignments: [...teams, ...userList] });
  };

  return (
    <div className="space-y-5">
      <input
        value={local.title || ''}
        onChange={(e) => setLocal({ ...local, title: e.target.value })}
        onBlur={() => patch({ title: local.title })}
        disabled={!canEdit}
        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] hover:border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none disabled:cursor-default disabled:opacity-100 disabled:hover:border-transparent"
      />

      <div className="grid grid-cols-2 gap-3 px-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Status</label>
          <div className="flex items-center gap-2">
            <Pill label={displayStatus} color={STATUS_COLORS[displayStatus]} bg={STATUS_BG[displayStatus]} />
            <select
              value={local.status}
              disabled={!canEdit || saving}
              onChange={(e) => patch({ status: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
            >
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Priority</label>
          <div className="flex items-center gap-2">
            <PriorityFlag priority={local.priority} />
            <select
              value={local.priority}
              disabled={!canEdit || saving}
              onChange={(e) => patch({ priority: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
            >
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <EditableDate label="Start" value={local.start_datetime} disabled={!canEdit || saving} onChange={(v) => patch({ start_datetime: v })} />
        <EditableDate label="Due" value={local.deadline_datetime} disabled={!canEdit || saving} onChange={(v) => patch({ deadline_datetime: v })} />
      </div>

      <div className="px-2">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Description</h4>
        <textarea
          value={local.description || ''}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          onBlur={() => patch({ description: local.description })}
          disabled={!canEdit}
          rows={3}
          placeholder="Add a description…"
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] disabled:cursor-default disabled:opacity-100 disabled:hover:border-[var(--border)]"
        />
      </div>

      <div className="px-2">
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Assignees</h4>
        <div className="flex flex-wrap items-center gap-2">
          {userAssignees.length === 0 && teamAssignees.length === 0 && (
            <span className="text-xs text-[var(--text-muted)]">No users assigned</span>
          )}
          {userAssignees.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] py-0.5 pl-0.5 pr-2.5 text-xs ring-1 ring-[var(--border-subtle)]">
              <UserAvatar user={{ full_name: a.reference_name, avatar_url: a.avatar_url }} size="xs" />
              {a.reference_name}
            </span>
          ))}
          {teamAssignees.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-secondary)_14%,transparent)] px-2.5 py-0.5 text-xs text-[var(--color-secondary)]">
              <UserIcon size={12} /> {teamAssignees.length} team{teamAssignees.length > 1 ? 's' : ''}
            </span>
          )}
          {isAnyAdmin && (
            <AssigneePicker
              assignments={local.assignments}
              onSave={handleAssigneesSave}
              alwaysAdd
              buttonClassName="h-7 w-7 justify-center rounded-full border-dashed p-0 text-[var(--text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            />
          )}
        </div>
      </div>

      <SubtaskList
        subtasks={local.subtasks}
        canManage={isAnyAdmin}
        onToggle={handleToggleSubtask}
        onDelete={(id) => setPendingSubtaskId(id)}
        onAdd={handleAddSubtask}
        onAssign={handleAssignSubtask}
        onOpenTask={onOpenTask}
        scrollIntoView={focusSubtasks}
      />

      {Array.isArray(local.custom_fields) && local.custom_fields.length > 0 && (
        <div className="px-2">
          <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Custom fields</h4>
          <div className="space-y-1">
            {local.custom_fields.map((f) => (
              <div key={f.field_id} className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">{f.name}</span>
                <span className="font-medium text-[var(--text-primary)]">{f.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] px-2 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"><TrendingUp size={15} /> Progress</h4>
          {isAssigned && (
            <button type="button" onClick={() => setShowProgress(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
              <TrendingUp size={12} /> Update
            </button>
          )}
        </div>
        {local.progress && local.progress.length > 0 ? (
          <div className="space-y-2">
            {local.progress.slice(0, 4).map((p) => (
              <div key={p.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[var(--text-primary)]">{p.user_name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{formatDateTime(p.updated_at)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-700"><div className="h-full rounded-full bg-blue-500" style={{ width: `${p.completion_rate}%` }} /></div>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">{p.completion_rate}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-[var(--text-muted)]">No progress updates yet.</p>}
      </div>

      <div className="px-2">
        <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"><Paperclip size={15} /> Attachments</h4>
        <AttachmentSection attachments={local.attachments} onDelete={(id) => setPendingAttachmentId(id)} canManage={isAssigned} />
        {isAssigned && (
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-3.5 py-2 text-xs font-medium hover:border-[var(--color-primary)] hover:bg-[var(--bg-hover)]">
            <Paperclip size={14} /> Upload
            <input type="file" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const fd = new FormData(); fd.append('file', f); try { await uploadFile(taskId, fd); } catch { /* toast in hook */ } } }} />
          </label>
        )}
      </div>

      <div className="border-t border-[var(--border)] px-2 pt-4">
        <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"><MessageSquare size={15} /> Activity</h4>
        <CommentSection comments={local.comments} currentUser={user} isAdmin={isAnyAdmin} canReply={isAssigned}
          onAddComment={(c, parentId, files, mentions) => postComment(taskId, c, parentId, files, mentions)} />
      </div>

      <ProgressModal open={showProgress} onClose={() => setShowProgress(false)} onSubmit={updateProgress} saving={saving} taskId={taskId} initialProgress={local.progress?.[0]} />
      <ConfirmationDialog
        isOpen={pendingAttachmentId !== null}
        onClose={() => setPendingAttachmentId(null)}
        onConfirm={async () => { await removeAttachment(taskId, pendingAttachmentId); setPendingAttachmentId(null); }}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment?"
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmationDialog
        isOpen={pendingSubtaskId !== null}
        onClose={() => setPendingSubtaskId(null)}
        onConfirm={handleDeleteSubtask}
        title="Delete Sub-task"
        message="Are you sure you want to delete this sub-task? Its own sub-tasks, if any, will be removed too."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

function GenericBody({ entity }) {
  if (!entity) return <div className="text-sm text-[var(--text-muted)]">No details.</div>;
  const fields = Object.entries(entity).filter(([k, v]) =>
    v != null && typeof v !== 'object' && !['id', 'created_at', 'updated_at'].includes(k)
  );
  return (
    <div className="space-y-5">
      <input
        defaultValue={entity.name || entity.business_name || entity.client_name || ''}
        readOnly
        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] focus:border-[var(--border)] focus:outline-none"
      />
      {entity.description && (
        <div className="px-2">
          <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Description</h4>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{entity.description}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 px-2">
        {fields.slice(0, 6).map(([k, v]) => (
          <Field key={k} label={k.replace(/_/g, ' ')}>{String(v)}</Field>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-2 pt-4">
        <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"><MessageSquare size={15} /> Activity</h4>
        <p className="text-xs text-[var(--text-muted)]">No activity yet.</p>
      </div>
    </div>
  );
}

function ActivityPlaceholder() {
  return (
    <div className="border-t border-[var(--border)] px-2 pt-4">
      <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
        <MessageSquare size={15} /> Activity
      </h4>
      <p className="text-xs text-[var(--text-muted)]">No activity yet.</p>
    </div>
  );
}

function EntityLoader() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-sm text-[var(--text-muted)]">
      <Loader2 size={18} className="animate-spin" /> Loading…
    </div>
  );
}

// Editable Client panel. Opens directly editable — no separate view/edit step.
function ClientBody({ clientId, entity, open, onUpdated }) {
  const { toast } = useToast();
  const [local, setLocal] = useState(entity || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (clientId) {
      let active = true;
      setLoading(true);
      getClient(clientId)
        .then((data) => { if (active) setLocal(data); })
        .catch((err) => toast.error(err.message || 'Failed to load client'))
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
    setLocal(entity || null);
  }, [open, clientId, entity, toast]);

  const patch = async (payload) => {
    if (!local?.id) return;
    setSaving(true);
    try {
      const updated = await updateClient(local.id, payload);
      setLocal((p) => ({ ...p, ...updated }));
      onUpdated?.(updated);
      toast.success('Client updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  if (loading && !local) return <EntityLoader />;
  if (!local) return <div className="text-sm text-[var(--text-muted)]">Client not found.</div>;

  const businesses = Array.isArray(local.businesses) ? local.businesses : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 px-2">
        {saving && <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />}
        <input
          value={local.client_name || ''}
          onChange={(e) => setLocal({ ...local, client_name: e.target.value })}
          onBlur={() => patch({ client_name: local.client_name })}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] hover:border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none"
        />
      </div>
      <div className="px-2">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Businesses</h4>
        {businesses.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No businesses yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
            {businesses.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-[var(--text-primary)]">{b.business_name}</span>
                <span className="text-xs text-[var(--text-muted)]">{b.project_count || 0} projects</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {(local.created_by_name || local.created_at) && (
        <div className="grid grid-cols-2 gap-3 px-2">
          {local.created_by_name && <Field label="Created by">{local.created_by_name}</Field>}
          {local.created_at && <Field label="Created">{formatDateTime(local.created_at)}</Field>}
        </div>
      )}
      <ActivityPlaceholder />
    </div>
  );
}

// Editable Business panel. Mirrors server/businessModel allowed fields.
function BusinessBody({ businessId, entity, open, onUpdated }) {
  const { toast } = useToast();
  const [local, setLocal] = useState(entity || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (businessId) {
      let active = true;
      setLoading(true);
      getBusiness(businessId)
        .then((data) => { if (active) setLocal(data); })
        .catch((err) => toast.error(err.message || 'Failed to load business'))
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }
    setLocal(entity || null);
  }, [open, businessId, entity, toast]);

  const patch = async (field, value) => {
    if (!local?.id) return;
    setSaving(true);
    try {
      const updated = await updateBusiness(local.id, { [field]: value });
      setLocal((p) => ({ ...p, ...updated }));
      onUpdated?.(updated);
      toast.success('Business updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update business');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  if (loading && !local) return <EntityLoader />;
  if (!local) return <div className="text-sm text-[var(--text-muted)]">Business not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 px-2">
        {saving && <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />}
        <input
          value={local.business_name || ''}
          onChange={(e) => setLocal({ ...local, business_name: e.target.value })}
          onBlur={() => patch('business_name', local.business_name)}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] hover:border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none"
        />
      </div>
      <div className="px-2">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Description</h4>
        <textarea
          value={local.description || ''}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          onBlur={() => patch('description', local.description)}
          rows={3}
          placeholder="Add a description…"
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 px-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Status</label>
          <select
            value={local.status || 'Active'}
            onChange={(e) => { const v = e.target.value; setLocal((p) => ({ ...p, status: v })); patch('status', v); }}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
          >
            {['Active', 'On Hold', 'Completed', 'Cancelled'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <Field label="Code">{local.business_code || '—'}</Field>
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Email</label>
          <input
            value={local.email || ''}
            onChange={(e) => setLocal({ ...local, email: e.target.value })}
            onBlur={() => patch('email', local.email)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Phone</label>
          <input
            value={local.phone || ''}
            onChange={(e) => setLocal({ ...local, phone: e.target.value })}
            onBlur={() => patch('phone', local.phone)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Address</label>
          <input
            value={local.address || ''}
            onChange={(e) => setLocal({ ...local, address: e.target.value })}
            onBlur={() => patch('address', local.address)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>
      <ActivityPlaceholder />
    </div>
  );
}

function ProjectBody({ projectId, open, onUpdated }) {
  const { toast } = useToast();
  const [local, setLocal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    let active = true;
    setLoading(true);
    getProject(projectId)
      .then((data) => { if (active) setLocal(data); })
      .catch((err) => { if (active) toast.error(err.message || 'Failed to load project'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, projectId, toast]);

  const patch = async (payload) => {
    setSaving(true);
    try {
      const updated = await updateProject(projectId, payload);
      setLocal(updated);
      onUpdated?.(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  if (loading && !local) {
    return <div className="flex flex-col items-center gap-2 py-12 text-sm text-[var(--text-muted)]"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-blue-500" />Loading…</div>;
  }
  if (!local) return <div className="text-sm text-[var(--text-muted)]">Project not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />}
        <input
          value={local.name || ''}
          onChange={(e) => setLocal({ ...local, name: e.target.value })}
          onBlur={() => patch({ name: local.name })}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] hover:border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none"
        />
      </div>

      <div className="px-2">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Description</h4>
        <textarea
          value={local.description || ''}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          onBlur={() => patch({ description: local.description })}
          rows={4}
          placeholder="Add a description…"
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 px-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Status</label>
          <select
            value={local.status || 'Active'}
            onChange={(e) => { const v = e.target.value; setLocal((p) => ({ ...p, status: v })); patch({ status: v }); }}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
          >
            {['Active', 'On Hold', 'Completed', 'Cancelled'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Start Date</label>
          <input
            type="date"
            value={toLocalInputValue(local.start_date)?.slice(0, 10) || ''}
            onChange={(e) => { const v = e.target.value; setLocal((p) => ({ ...p, start_date: v })); patch({ start_date: v }); }}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <Field label="Client">{local.client_name || '—'}</Field>
        <Field label="Business">{local.client_business_name || '—'}</Field>
      </div>

      <div className="border-t border-[var(--border)] px-2 pt-4">
        <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"><MessageSquare size={15} /> Activity</h4>
        <p className="text-xs text-[var(--text-muted)]">No activity yet.</p>
      </div>
    </div>
  );
}

export default function EntityDetailPanel({ open, onClose, type = 'task', taskId, projectId, clientId, businessId, entity, onUpdated, onDeleted, onOpenTask, focusSubtasks = false, readOnly = false }) {
  const { toast } = useToast();
  const [pendingDelete, setPendingDelete] = useState(false);
  const label = ENTITY_LABEL[type] || 'Task';

  const confirmDelete = async () => {
    try {
      if (type === 'project' && projectId) await deleteProject(projectId);
      else if (type === 'client' && clientId) await deleteClient(clientId);
      else if (type === 'business' && businessId) await deleteBusiness(businessId);
      else return;
      toast.success(`${label} deleted`);
      setPendingDelete(false);
      onClose();
      onDeleted?.();
    } catch (err) {
      toast.error(err.message || `Failed to delete ${label.toLowerCase()}`);
      setPendingDelete(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={null} size="lg" showBackdrop>
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-primary)', backgroundColor: 'color-mix(in_srgb, var(--color-primary) 12%, transparent)' }}
              >
                {label}
              </span>
              {readOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  View Only
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {type !== 'task' && (
                <button
                  onClick={() => setPendingDelete(true)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              )}
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.25, ease: "easeOut" }}
            >
            {type === 'task'
              ? <TaskBody taskId={taskId} open={open} onClose={onClose} onUpdated={onUpdated} onOpenTask={onOpenTask} focusSubtasks={focusSubtasks} readOnly={readOnly} />
              : type === 'project'
                ? <ProjectBody projectId={projectId} open={open} onClose={onClose} onUpdated={onUpdated} />
                : type === 'client'
                  ? <ClientBody clientId={clientId} entity={entity} open={open} onUpdated={onUpdated} onDeleted={onDeleted} />
                  : type === 'business'
                    ? <BusinessBody businessId={businessId} entity={entity} open={open} onUpdated={onUpdated} onDeleted={onDeleted} />
                    : <GenericBody entity={entity} type={type} />}
            </motion.div>
          </div>
          <ConfirmationDialog
            isOpen={pendingDelete}
            onClose={() => setPendingDelete(false)}
            onConfirm={confirmDelete}
            title={`Delete ${label}`}
            message={`Are you sure you want to delete this ${label.toLowerCase()}? This action cannot be undone.`}
            confirmText="Delete"
            variant="destructive"
          />
        </div>
      )}
    </Drawer>
  );
}
