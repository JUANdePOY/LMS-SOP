import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Copy, FolderInput, Trash2, MoreHorizontal, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_PRIORITIES, TASK_PRIORITY_DOT } from '../constants/taskConstants';
import { useClickOutside } from '../hooks/useClickOutside';
import { getUsersForAssignment } from '../api/assignment.api';
import { formatDate } from '../utils/taskDateUtils';
import { useToast } from '@/shared/components/ui/Toast';
import { duplicateTask } from '../services/taskService';

const STATUS_TOKENS = {
  Pending: { var: '--ppm-st-pending', label: 'Not Started' },
  'In Progress': { var: '--ppm-st-in-progress', label: 'In Progress' },
  Completed: { var: '--ppm-st-completed', label: 'Completed' },
  Overdue: { var: '--ppm-st-overdue', label: 'Overdue' },
  Cancelled: { var: '--ppm-st-cancelled', label: 'Cancelled' },
};

function StatusDot({ status }) {
  const token = STATUS_TOKENS[status] || STATUS_TOKENS.Pending;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-primary)]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: `var(${token.var})` }} aria-hidden="true" />
      {token.label}
    </span>
  );
}

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <span ref={ref} className="relative inline-block">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="rounded px-1 py-0.5 hover:bg-[var(--bg-surface-hover)]">
        <StatusDot status={status} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl">
          {Object.keys(STATUS_TOKENS).map((s) => (
            <button key={s} type="button" onClick={(e) => { e.stopPropagation(); onChange?.(s); setOpen(false); }} className="flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
              <StatusDot status={s} />
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function PriorityDropdown({ priority, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <span ref={ref} className="relative inline-block">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
        <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_DOT[priority] || TASK_PRIORITY_DOT.Medium)} />
        {priority || 'None'}
        <ChevronDown size={10} className="text-[var(--text-muted)]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-32 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl">
          {TASK_PRIORITIES.map((p) => (
            <button key={p} type="button" onClick={(e) => { e.stopPropagation(); onChange?.(p); setOpen(false); }} className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-surface-hover)]', p === priority && 'font-semibold')}>
              <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_DOT[p])} />
              {p}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function DueDateCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const open = useCallback(() => {
    setDraft(value ? new Date(value).toISOString().slice(0, 10) : '');
    setEditing(true);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft) {
      onChange?.(new Date(draft).toISOString());
    } else {
      onChange?.(null);
    }
  };

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded border border-[var(--color-primary)] bg-[var(--bg-surface)] px-1 py-0.5 text-xs outline-none"
      />
    );
  }

  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); open(); }} className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
      <Calendar size={11} className="text-[var(--text-muted)]" />
      {value ? formatDate(value) : '—'}
    </button>
  );
}

function AssigneePicker({ assignments, onSave }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await getUsersForAssignment(query);
        if (active) setOptions(results);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [open, query]);

  const currentUsers = (assignments || []).filter((a) => a.assignment_type === 'User');

  const select = (user) => {
    const next = [...currentUsers, { assignment_type: 'User', reference_id: String(user.id), reference_name: user.full_name, avatar_url: user.avatar_url }];
    onSave(next);
    setQuery('');
  };

  const remove = (refId) => {
    const next = currentUsers.filter((a) => String(a.reference_id) !== String(refId));
    onSave(next);
  };

  return (
    <span ref={ref} className="relative inline-block w-full">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="flex w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-[var(--bg-surface-hover)]">
        {currentUsers.length === 0 ? (
          <span className="text-xs text-[var(--text-muted)]">Unassigned</span>
        ) : (
          <span className="flex items-center gap-1 truncate">
            <span className="h-5 w-5 shrink-0 rounded-full bg-[var(--bg-surface-hover)] text-[9px] font-medium text-[var(--text-secondary)] flex items-center justify-center">
              {(currentUsers[0].reference_name || '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate text-xs text-[var(--text-secondary)]">{currentUsers[0].reference_name}</span>
            {currentUsers.length > 1 && <span className="text-[10px] text-[var(--text-muted)]">+{currentUsers.length - 1}</span>}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-2 shadow-xl">
          <div className="px-2 pb-1">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="max-h-32 overflow-y-auto px-1">
            {loading && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">Searching...</p>}
            {!loading && options.length === 0 && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">No results</p>}
            {options.map((u) => (
              <button key={u.id} type="button" onClick={(e) => { e.stopPropagation(); select(u); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
                <span className="h-5 w-5 shrink-0 rounded-full bg-[var(--bg-surface-hover)] text-[9px] font-medium text-[var(--text-secondary)] flex items-center justify-center">
                  {(u.full_name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-[var(--text-primary)]">{u.full_name}</span>
              </button>
            ))}
          </div>
          {currentUsers.length > 0 && (
            <div className="mt-1 border-t border-[var(--border)] px-2 pt-1">
              {currentUsers.map((a) => (
                <div key={a.reference_id} className="flex items-center justify-between py-0.5">
                  <span className="truncate text-xs text-[var(--text-secondary)]">{a.reference_name}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); remove(a.reference_id); }} className="text-[var(--text-muted)] hover:text-red-500">
                    <span className="text-xs">×</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  );
}

function MoveToProjectPicker({ projects, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const ref = useClickOutside(onClose);

  const filtered = projects.filter((p) =>
    !query || (p.name || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-2 shadow-xl">
      <div className="px-2 pb-1">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects..."
          className="w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div className="max-h-36 overflow-y-auto px-1">
        {filtered.length === 0 && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">No projects</p>}
        {filtered.map((p) => (
          <button key={p.id} type="button" onClick={(e) => { e.stopPropagation(); onSelect(p); onClose(); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
            <FolderInput size={12} className="shrink-0 text-[var(--text-muted)]" />
            <span className="truncate text-[var(--text-primary)]">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InlineDeleteConfirm({ onConfirm, onCancel }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 dark:border-red-900/40 dark:bg-red-950/30">
      <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
      <button type="button" onClick={onCancel} className="rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">Cancel</button>
      <button type="button" onClick={onConfirm} className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700">Delete</button>
    </span>
  );
}

function MoreActionsMenu({ task, projects, onOpen, onMoveProject, onDelete, onDuplicate }) {
  const [open, setOpen] = useState(false);
  const [subview, setSubview] = useState(null); // null | 'move' | 'delete'
  const ref = useClickOutside(() => { setOpen(false); setSubview(null); });

  const close = () => { setOpen(false); setSubview(null); };

  if (!open) {
    return (
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]" aria-label="More actions">
        <MoreHorizontal size={14} />
      </button>
    );
  }

  if (subview === 'delete') {
    return (
      <span ref={ref} className="inline-flex">
        <InlineDeleteConfirm onConfirm={() => { onDelete(task); close(); }} onCancel={() => setSubview(null)} />
      </span>
    );
  }

  if (subview === 'move') {
    return (
      <span ref={ref} className="relative inline-block">
        <MoveToProjectPicker projects={projects} onSelect={(p) => onMoveProject(task, p)} onClose={() => setSubview(null)} />
      </span>
    );
  }

  return (
    <span ref={ref} className="relative inline-block">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]">
        <MoreHorizontal size={14} />
      </button>
      <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl">
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(task); close(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
          Open
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate?.(task); close(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
          <Copy size={13} /> Duplicate
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); setSubview('move'); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
          <FolderInput size={13} /> Move to project
        </button>
        <div className="my-1 border-t border-[var(--border)]" />
        <button type="button" onClick={(e) => { e.stopPropagation(); setSubview('delete'); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </span>
  );
}

export function TaskRow({ task, dimmed, onViewTask, onStatusChange, onInlineUpdate, onDelete, onDeleteImmediate, onDuplicated, projects }) {
  const { toast } = useToast();
  const overdue = task.deadline_datetime && task.status !== 'Completed' && task.status !== 'Cancelled' && new Date(task.deadline_datetime) < new Date();

  const handleCompleteToggle = () => {
    if (task.status === 'Completed') {
      onStatusChange?.(task, 'In Progress');
    } else {
      onStatusChange?.(task, 'Completed');
    }
  };

  const handleAssigneeSave = (next) => {
    onInlineUpdate?.(task, { assignments: next });
  };

  const handleMoveProject = (t, project) => {
    onInlineUpdate?.(t, { project_id: project.id });
  };

  // Prefer the direct (modal-free) delete when available (List tab); fall back
  // to the modal-backed path used by other views.
  const handleDelete = (t) => {
    if (onDeleteImmediate) onDeleteImmediate(t.id);
    else onDelete?.(t.id);
  };

  const handleDuplicate = async (t) => {
    try {
      await duplicateTask(t.id);
      toast.success('Task duplicated');
      onDuplicated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate task');
    }
  };

  return (
    <div
      role="row"
      className={cn(
        'group grid grid-cols-[36px_minmax(0,1fr)_120px_150px_100px_90px_110px_40px] items-center gap-2 border-b border-[var(--border-subtle)] px-2 py-2 text-sm transition-colors',
        'hover:bg-[var(--bg-surface-hover)]',
        dimmed && 'opacity-40'
      )}
    >
      <span className="flex items-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleCompleteToggle}
          className={cn(
            'grid h-4 w-4 place-items-center rounded border-2 transition-colors',
            task.status === 'Completed'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-[var(--border)] hover:border-emerald-500'
          )}
          title={task.status === 'Completed' ? 'Mark incomplete' : 'Mark complete'}
          aria-label={task.status === 'Completed' ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.status === 'Completed' && <Check size={10} strokeWidth={3} />}
        </button>
      </span>

      <span className="min-w-0 truncate text-[var(--text-primary)] cursor-pointer hover:underline" style={{ paddingLeft: '4px' }} onClick={() => onViewTask?.(task)}>
        {task.title}
      </span>

      <span onClick={(e) => e.stopPropagation()}>
        <AssigneePicker assignments={task.assignments} onSave={handleAssigneeSave} />
      </span>

      <span onClick={(e) => e.stopPropagation()}>
        <StatusDropdown status={overdue ? 'Overdue' : task.status} onChange={(s) => onStatusChange?.(task, s)} />
      </span>

      <span onClick={(e) => e.stopPropagation()}>
        <PriorityDropdown priority={task.priority} onChange={(p) => onInlineUpdate?.(task, { priority: p })} />
      </span>

      <span onClick={(e) => e.stopPropagation()}>
        <DueDateCell value={task.deadline_datetime} onChange={(d) => onInlineUpdate?.(task, { deadline_datetime: d })} />
      </span>

      <span className="flex items-center gap-1.5">
        <span className="h-1 flex-1 rounded-full bg-[var(--border-subtle)]">
          <span className="block h-1 rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.max(0, Math.min(100, Number(task.progress_rate ?? task.completion_rate ?? 0)))}%` }} />
        </span>
      </span>

      <span className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
        <MoreActionsMenu
          task={task}
          projects={projects}
          onOpen={(t) => onViewTask?.(t)}
          onMoveProject={handleMoveProject}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </span>
    </div>
  );
}
