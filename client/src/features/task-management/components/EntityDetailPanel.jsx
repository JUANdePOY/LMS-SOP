import { useState, useEffect } from 'react';
import { X, Calendar, User as UserIcon, MessageSquare, Paperclip, TrendingUp, Loader2 } from 'lucide-react';
import Drawer from '@/shared/components/ui/Drawer';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/shared/components/ui/Avatar';
import PriorityFlag from './PriorityFlag';
import { updateTask, getTask } from '../services/taskService';
import { getProject, updateProject } from '../services/projectService';
import { useToast } from '@/shared/components/ui/Toast';
import { useTaskDetails } from '../hooks/useTaskDetails';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import { formatDateTime, toLocalInputValue } from '../utils/taskDateUtils';
import AttachmentSection from './AttachmentSection';
import CommentSection from './CommentSection';
import ProgressModal from './ProgressModal';
import ConfirmationDialog from '@/shared/components/ui/ConfirmationDialog';

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

function TaskBody({ taskId, open, onUpdated }) {
  const { toast } = useToast();
  const { user, isAnyAdmin } = useAuth();
  const [local, setLocal] = useState(null);
  const [comment, setComment] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [pendingAttachmentId, setPendingAttachmentId] = useState(null);
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

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await postComment(taskId, comment.trim());
      setComment('');
    } catch { /* toast handled in hook */ }
  };

  if (!open) return null;
  if (loading && !local) {
    return <div className="flex flex-col items-center gap-2 py-12 text-sm text-[var(--text-muted)]"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-blue-500" />Loading…</div>;
  }
  if (error && !local) return <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</div>;
  if (!local) return <div className="text-sm text-[var(--text-muted)]">Task not found.</div>;

  const userAssignees = (local.assignments || []).filter((a) => a.assignment_type === 'User');
  const teamAssignees = (local.assignments || []).filter((a) => a.assignment_type === 'Department');

  return (
    <div className="space-y-5">
      <input
        value={local.title || ''}
        onChange={(e) => setLocal({ ...local, title: e.target.value })}
        onBlur={() => patch({ title: local.title })}
        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] hover:border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-3 px-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Status</label>
          <div className="flex items-center gap-2">
            <Pill label={local.status} color={STATUS_COLORS[local.status]} bg={STATUS_BG[local.status]} />
            <select
              value={local.status}
              disabled={saving}
              onChange={(e) => patch({ status: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
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
              disabled={saving}
              onChange={(e) => patch({ priority: e.target.value })}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
            >
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <Field label="Start">{local.start_datetime ? formatDateTime(local.start_datetime) : '—'}</Field>
        <Field label="Due">{local.deadline_datetime ? formatDateTime(local.deadline_datetime) : '—'}</Field>
      </div>

      <div className="space-y-2 px-2">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Calendar size={15} /> Start: {local.start_datetime ? formatDateTime(local.start_datetime) : '—'}
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Calendar size={15} /> Due: {local.deadline_datetime ? formatDateTime(local.deadline_datetime) : '—'}
        </div>
      </div>

      <div className="px-2">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Description</h4>
        <textarea
          value={local.description || ''}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          onBlur={() => patch({ description: local.description })}
          rows={3}
          placeholder="Add a description…"
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div className="px-2">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Assignees</h4>
        <div className="flex flex-wrap items-center gap-2">
          {userAssignees.length === 0 && <span className="text-xs text-[var(--text-muted)]">No users assigned</span>}
          {userAssignees.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs">
              <UserAvatar user={{ full_name: a.reference_name, avatar_url: a.avatar_url }} size="xs" />
              {a.reference_name}
            </span>
          ))}
          {teamAssignees.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-secondary)_14%,transparent)] px-2.5 py-0.5 text-xs text-[var(--color-secondary)]">
              <UserIcon size={12} /> {teamAssignees.length} team{teamAssignees.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

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
          <button type="button" onClick={() => setShowProgress(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
            <TrendingUp size={12} /> Update
          </button>
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
        <AttachmentSection attachments={local.attachments} onDelete={(id) => setPendingAttachmentId(id)} canManage />
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-3.5 py-2 text-xs font-medium hover:border-[var(--color-primary)] hover:bg-[var(--bg-hover)]">
          <Paperclip size={14} /> Upload
          <input type="file" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const fd = new FormData(); fd.append('file', f); try { await uploadFile(taskId, fd); } catch { /* toast in hook */ } } }} />
        </label>
      </div>

      <div className="border-t border-[var(--border)] px-2 pt-4">
        <h4 className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"><MessageSquare size={15} /> Activity</h4>
        <CommentSection comments={local.comments} currentUser={user} isAdmin={isAnyAdmin} canReply
          onAddComment={(c, parentId) => postComment(taskId, c, parentId)} />
        <div className="mt-3 flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            placeholder="Write a comment…"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <button onClick={handleComment} disabled={!comment.trim()} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Send</button>
        </div>
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

// Read-only presentation for a Client. Editing (and its trigger from the
// sidebar/breadcrumb) is wired in Phase 5; this keeps the panel intentional
// for all four entity types in the meantime.
function ClientBody({ entity }) {
  if (!entity) return <div className="text-sm text-[var(--text-muted)]">No details.</div>;
  const businesses = Array.isArray(entity.businesses) ? entity.businesses : [];
  return (
    <div className="space-y-5">
      <input
        defaultValue={entity.client_name || ''}
        readOnly
        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] focus:border-[var(--border)] focus:outline-none"
      />
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
      {(entity.created_by_name || entity.created_at) && (
        <div className="grid grid-cols-2 gap-3 px-2">
          {entity.created_by_name && <Field label="Created by">{entity.created_by_name}</Field>}
          {entity.created_at && <Field label="Created">{formatDateTime(entity.created_at)}</Field>}
        </div>
      )}
      <ActivityPlaceholder />
    </div>
  );
}

// Read-only presentation for a Business. Editing (and its trigger) is wired in
// Phase 5; fields mirror server/businessModel.js.
function BusinessBody({ entity }) {
  if (!entity) return <div className="text-sm text-[var(--text-muted)]">No details.</div>;
  return (
    <div className="space-y-5">
      <input
        defaultValue={entity.business_name || ''}
        readOnly
        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-[var(--text-primary)] focus:border-[var(--border)] focus:outline-none"
      />
      <div className="px-2">
        <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Description</h4>
        <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{entity.description || '—'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 px-2">
        {entity.status && <Field label="Status">{entity.status}</Field>}
        {entity.business_code && <Field label="Code">{entity.business_code}</Field>}
        {entity.email && <Field label="Email">{entity.email}</Field>}
        {entity.phone && <Field label="Phone">{entity.phone}</Field>}
        {entity.address && <Field label="Address">{entity.address}</Field>}
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

export default function EntityDetailPanel({ open, onClose, type = 'task', taskId, projectId, entity, onUpdated }) {
  const label = ENTITY_LABEL[type] || 'Task';
  return (
    <Drawer open={open} onClose={onClose} title={null} size="lg" showBackdrop={false}>
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--color-primary)', backgroundColor: 'color-mix(in_srgb, var(--color-primary) 12%, transparent)' }}
            >
              {label}
            </span>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {type === 'task'
              ? <TaskBody taskId={taskId} open={open} onClose={onClose} onUpdated={onUpdated} />
              : type === 'project'
                ? <ProjectBody projectId={projectId} open={open} onClose={onClose} onUpdated={onUpdated} />
                : type === 'client'
                  ? <ClientBody entity={entity} />
                  : type === 'business'
                    ? <BusinessBody entity={entity} />
                    : <GenericBody entity={entity} type={type} />}
          </div>
        </div>
      )}
    </Drawer>
  );
}
