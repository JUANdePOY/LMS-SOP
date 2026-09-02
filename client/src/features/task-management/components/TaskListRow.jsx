import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Copy, FolderInput, Trash2, MoreHorizontal, Calendar, ExternalLink, UserPlus, Link2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_PRIORITIES, TASK_PRIORITY_DOT } from '../constants/taskConstants';
import { useClickOutside } from '../hooks/useClickOutside';
import { getUsersForAssignment } from '../api/assignment.api';
import { formatDate } from '../utils/taskDateUtils';
import { useToast } from '@/shared/components/ui/Toast';
import { duplicateTask } from '../services/taskService';
import { HIERARCHY_GRID } from './TaskHierarchyTable';
import InlineEditableName from './InlineEditableName';

const STATUS_TOKENS = {
  Pending: { var: '--ppm-st-pending', label: 'Not Started' },
  'In Progress': { var: '--ppm-st-in-progress', label: 'In Progress' },
  Completed: { var: '--ppm-st-completed', label: 'Completed' },
  Overdue: { var: '--ppm-st-overdue', label: 'Overdue' },
  Cancelled: { var: '--ppm-st-cancelled', label: 'Cancelled' },
};

function StatusDot({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--border)]" aria-hidden="true" />
        No status
      </span>
    );
  }
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
        {status ? <StatusDot status={status} /> : <span className="text-xs text-[var(--text-muted)]">Set status</span>}
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

function isOverdue(task) {
  if (!task.deadline_datetime || task.status === 'Completed' || task.status === 'Cancelled') return false;
  return new Date(task.deadline_datetime) < new Date();
}

function DueDateCell({ value, onChange, overdue = false }) {
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
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); open(); }}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs tabular-nums hover:bg-[var(--bg-surface-hover)]',
        overdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-secondary)]'
      )}
    >
      <Calendar size={11} className={overdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'} />
      {value ? formatDate(value) : '—'}
    </button>
  );
}

function Avatar({ name, avatarUrl, size = 20, className = '' }) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className={cn('rounded-full object-cover', className)}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        'flex items-center justify-center rounded-full bg-[var(--bg-surface-hover)] text-[9px] font-medium text-[var(--text-secondary)]',
        className
      )}
    >
      {initials}
    </span>
  );
}

export function AssigneePicker({ assignments, onSave, alwaysAdd = false, buttonClassName = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 224 });
  const [maxHeight, setMaxHeight] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const VIEWPORT_MARGIN = 8;

  // Position the popover with fixed coordinates so it renders above scrollable
  // / overflow containers (the hierarchy table lives inside an overflow-x-auto
  // wrapper) that would otherwise clip an absolutely-positioned dropdown. It
  // also flips upward and clamps its height when there isn't enough room below
  // the trigger, so it never overflows the bottom of the viewport.
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 224);
    const ddHeight = dropdownRef.current ? dropdownRef.current.offsetHeight : 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = ddHeight > spaceBelow && spaceAbove > spaceBelow;
    let top = flipUp ? rect.top - ddHeight - 4 : rect.bottom + 4;
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - ddHeight - VIEWPORT_MARGIN));
    setCoords({ top, left: rect.left, width });
    const available = (flipUp ? rect.top : window.innerHeight - rect.bottom) - VIEWPORT_MARGIN;
    setMaxHeight(available > 160 ? available : 160);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleScroll = (e) => {
      if (dropdownRef.current && e.target && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (triggerRef.current && triggerRef.current.contains(event.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

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
  const assignedIds = new Set(currentUsers.map((u) => String(u.reference_id)));
  const selectableOptions = options.filter((u) => !assignedIds.has(String(u.id)));

  const select = (user) => {
    const userId = String(user.id);
    // Prevent assigning the same employee more than once.
    if (currentUsers.some((a) => String(a.reference_id) === userId)) {
      setQuery('');
      return;
    }
    const next = [...currentUsers, { assignment_type: 'User', reference_id: userId, reference_name: user.full_name, avatar_url: user.avatar_url }];
    onSave(next);
    setQuery('');
  };

  const remove = (refId) => {
    const next = currentUsers.filter((a) => String(a.reference_id) !== String(refId));
    onSave(next);
  };

  // Asana-style assignee cell: a stack of overlapping profile pictures with a
  // "+N" overflow chip. When empty it shows a dashed "add" placeholder; when
  // populated an add control fades in on hover. Clicking opens the people
  // picker (which lists every assigned employee with picture + name). A title
  // tooltip keeps all names readable. Fixed sizes + max-w-full keep it inside
  // the 120px column without overflowing neighbours.
  const MAX_VISIBLE = 3;
  const visible = currentUsers.slice(0, MAX_VISIBLE);
  const extra = currentUsers.length - visible.length;
  const allNames = currentUsers.map((u) => u.reference_name).join(', ');
  const nameLabel = currentUsers.length === 0
    ? ''
    : currentUsers.length === 1
      ? currentUsers[0].reference_name
      : `${currentUsers[0].reference_name} +${currentUsers.length - 1}`;

  const avatarStack = (
    <span className="flex items-center -space-x-2">
      {visible.map((u) => (
        <span key={u.reference_id} className="relative overflow-hidden rounded-full ring-2 ring-[var(--bg-surface)]">
          <Avatar name={u.reference_name} avatarUrl={u.avatar_url} size={22} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="flex items-center justify-center rounded-full bg-[var(--bg-surface-hover)] text-[10px] font-medium text-[var(--text-secondary)] ring-2 ring-[var(--bg-surface)]"
          style={{ width: 22, height: 22 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );

  const addControl = (
    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[var(--text-muted)] ring-1 ring-[var(--border)]">
      <UserPlus size={13} />
    </span>
  );

  const emptyState = (
    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-[var(--border)] text-[var(--text-muted)]">
      <UserPlus size={13} />
    </span>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={currentUsers.length ? allNames : 'Assign'}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          'group/asn inline-flex max-w-full items-center gap-1 overflow-hidden rounded-md py-0.5 pl-0.5 pr-1 transition-colors hover:bg-[var(--bg-surface-hover)]',
          buttonClassName
        )}
      >
        {alwaysAdd ? addControl : currentUsers.length === 0 ? emptyState : (
          <>
            {avatarStack}
            <span className="ml-1 min-w-0 truncate text-xs text-[var(--text-secondary)]">{nameLabel}</span>
          </>
        )}
        {!alwaysAdd && currentUsers.length > 0 && (
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 ring-1 ring-[var(--border)] transition-opacity group-hover/asn:opacity-100">
            <UserPlus size={13} />
          </span>
        )}
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 flex max-h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-2 shadow-xl"
          style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight }}
        >
          <div className="shrink-0 px-2 pb-1">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            {loading && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">Searching...</p>}
            {!loading && selectableOptions.length === 0 && (
              <p className="px-2 py-1 text-xs text-[var(--text-muted)]">
                {options.length === 0 ? 'No results' : 'All matched employees already assigned'}
              </p>
            )}
            {selectableOptions.map((u) => (
              <button key={u.id} type="button" onClick={(e) => { e.stopPropagation(); select(u); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
                <Avatar name={u.full_name} avatarUrl={u.avatar_url} />
                <span className="truncate text-[var(--text-primary)]">{u.full_name}</span>
              </button>
            ))}
          </div>
          {currentUsers.length > 0 && (
            <div className="mt-1 shrink-0 border-t border-[var(--border)] px-2 pt-1">
              {currentUsers.map((a) => (
                <div key={a.reference_id} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={a.reference_name} avatarUrl={a.avatar_url} />
                    <span className="truncate text-xs text-[var(--text-secondary)]">{a.reference_name}</span>
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); remove(a.reference_id); }} className="shrink-0 text-[var(--text-muted)] hover:text-red-500" aria-label={`Remove ${a.reference_name}`}>
                    <span className="text-xs">×</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function ReadOnlyAssignees({ assignments }) {
  const currentUsers = (assignments || []).filter((a) => a.assignment_type === 'User');
  if (currentUsers.length === 0) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }
  const MAX_VISIBLE = 3;
  const visible = currentUsers.slice(0, MAX_VISIBLE);
  const extra = currentUsers.length - visible.length;
  const allNames = currentUsers.map((u) => u.reference_name).join(', ');
  return (
    <span className="flex items-center -space-x-2" title={allNames}>
      {visible.map((u) => (
        <span key={u.reference_id} className="relative overflow-hidden rounded-full ring-2 ring-[var(--bg-surface)]">
          <Avatar name={u.reference_name} avatarUrl={u.avatar_url} size={22} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="flex items-center justify-center rounded-full bg-[var(--bg-surface-hover)] text-[10px] font-medium text-[var(--text-secondary)] ring-2 ring-[var(--bg-surface)]"
          style={{ width: 22, height: 22 }}
        >
          +{extra}
        </span>
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

function MoreActionsMenu({ task, projects, onOpen, onMoveProject, onDelete, onDuplicate, onAddSubtask, canManage = true }) {
  const [open, setOpen] = useState(false);
  const [subview, setSubview] = useState(null); // null | 'move' | 'delete'
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const close = () => { setOpen(false); setSubview(null); };

  // Position the dropdown with fixed coordinates so it stays above the
  // table's overflow-x-auto (responsive) scroll container instead of being clipped.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const MENU_W = 176;
      const MARGIN = 8;
      const dd = dropdownRef.current;
      const ddHeight = dd ? dd.offsetHeight : 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = ddHeight > spaceBelow && rect.top > spaceBelow;
      let top = flipUp ? rect.top - ddHeight - 4 : rect.bottom + 4;
      top = Math.max(MARGIN, Math.min(top, window.innerHeight - ddHeight - MARGIN));
      setCoords({ top, left: rect.right - MENU_W });
    };
    update();
    const onScroll = (e) => {
      if (dropdownRef.current && e.target && dropdownRef.current.contains(e.target)) return;
      close();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      close();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
      aria-label="More actions"
    >
      <MoreHorizontal size={14} />
    </button>
  );

  if (!open) return trigger;

  const menu = (
    <div ref={dropdownRef} className="fixed z-50 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl" style={{ top: coords.top, left: coords.left }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(task); close(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
        Open
      </button>
      {canManage && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); onAddSubtask?.(task); close(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
            <FolderInput size={13} /> Add sub-task
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
        </>
      )}
    </div>
  );

  const panel = (children) => (
    <div ref={dropdownRef} className="fixed z-50" style={{ top: coords.top, left: coords.left }}>
      {children}
    </div>
  );

  return (
    <>
      {trigger}
      {createPortal(
        subview === 'delete' ? panel(<InlineDeleteConfirm onConfirm={() => { onDelete(task); close(); }} onCancel={() => setSubview(null)} />)
          : subview === 'move' ? panel(<MoveToProjectPicker projects={projects} onSelect={(p) => onMoveProject(task, p)} onClose={() => setSubview(null)} />)
            : menu,
        document.body
      )}
    </>
  );
}

export function TaskRow({ task, dimmed, onViewTask, onStatusChange, onInlineUpdate, onDelete, onDeleteImmediate, onDuplicated, onRenameTask, canManage, projects, showCountBadges = false, subtaskCount = 0, isNew = false, tasksById = {}, onAddSubtask, onViewSubtasks }) {
  const { toast } = useToast();

  const overdue = isOverdue(task);

  // A sub-task is one with a parent_task_id. Resolve the parent's title from
  // the sibling map so the employee can see which task this one belongs to.
  const isSubtask = task.parent_task_id != null && task.parent_task_id !== '';
  const parentTask = isSubtask ? tasksById[String(task.parent_task_id)] : null;
  const parentTitle = parentTask?.title || null;

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
      onClick={(e) => {
        // Don't navigate when the click lands on the name (it renames) or any
        // interactive control — those stop propagation themselves, but this is a
        // safety net so the row never both renames and opens the detail view.
        if (e.target.closest('[data-no-nav]')) return;
        onViewTask?.(task);
      }}
      className={cn(
        'group grid h-10 gap-0 cursor-pointer overflow-hidden border-t border-b border-[var(--border-subtle)]/30 px-2 text-sm transition-colors',
        HIERARCHY_GRID,
        'hover:bg-[var(--bg-surface-hover)]',
        dimmed && 'opacity-40'
      )}
    >
      <span
        className="relative z-10 flex min-w-0 items-center gap-1.5 pr-2 border-r border-[var(--border-subtle)]/30"
        style={{ paddingLeft: '4px' }}
      >
        <button
          type="button"
          onClick={handleCompleteToggle}
          disabled={!canManage}
          aria-pressed={task.status === 'Completed'}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150 ease-out motion-reduce:transition-none',
            task.status === 'Completed'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--border)] hover:border-[var(--color-primary)]',
            !canManage && 'cursor-not-allowed opacity-60'
          )}
          title={task.status === 'Completed' ? 'Mark incomplete' : 'Mark complete'}
          aria-label={task.status === 'Completed' ? 'Mark incomplete' : 'Mark complete'}
        >
          <span
            className={cn(
              'transition-transform duration-100 ease-out motion-reduce:transition-none',
              task.status === 'Completed' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            )}
          >
            <Check size={10} strokeWidth={3} />
          </span>
        </button>
        <span className="inline-flex min-w-0 max-w-full items-center" data-no-nav>
          <InlineEditableName
            value={task.title}
            canEdit={canManage}
            onCommit={(next) => onRenameTask?.(task.id, next)}
            className="truncate text-[var(--text-primary)] hover:underline cursor-text"
            ariaLabel="Rename task"
          />
          {isNew && (
            <span className="ml-1.5 inline-flex h-5 shrink-0 items-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              New
            </span>
          )}
          {isSubtask && (
            <span
              className="ml-1.5 inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] px-1.5 text-[10px] font-medium text-[var(--color-primary)]"
              title={parentTitle ? `Sub-task of "${parentTitle}"` : 'Sub-task'}
            >
              <Link2 size={10} className="shrink-0" />
              Sub-task
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewTask?.(task); }}
            title="Open task details"
            aria-label="Open task details"
            className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ExternalLink size={13} />
          </button>
          <MoreActionsMenu
            task={task}
            projects={projects}
            canManage={canManage}
            onOpen={(t) => onViewTask?.(t)}
            onMoveProject={handleMoveProject}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
          {subtaskCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onViewSubtasks) onViewSubtasks(task);
                else onViewTask?.(task);
              }}
              title={`${subtaskCount} sub-task${subtaskCount === 1 ? '' : 's'}`}
              aria-label={`${subtaskCount} sub-task${subtaskCount === 1 ? '' : 's'}, open task`}
              className="ml-1.5 inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-[var(--bg-surface-hover)] px-1.5 text-[11px] font-medium tabular-nums text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
            >
              <ListTodo size={11} className="shrink-0" />
              {subtaskCount}
            </button>
          )}
        </span>
      </span>

      <span className="hidden min-w-0 items-center justify-center overflow-hidden sm:flex px-2 border-r border-[var(--border-subtle)]/30" onClick={(e) => e.stopPropagation()}>
        {canManage ? (
          <AssigneePicker assignments={task.assignments} onSave={handleAssigneeSave} />
        ) : (
          <ReadOnlyAssignees assignments={task.assignments} />
        )}
      </span>

      <span className="flex items-center justify-center px-2 border-r border-[var(--border-subtle)]/30" onClick={(e) => e.stopPropagation()}>
        {canManage ? (
          <StatusDropdown status={task.status} onChange={(s) => onStatusChange?.(task, s)} />
        ) : (
          <StatusDot status={task.status} />
        )}
      </span>

      <span className="hidden sm:flex items-center justify-center px-2 border-r border-[var(--border-subtle)]/30" onClick={(e) => e.stopPropagation()}>
        {canManage ? (
          <PriorityDropdown priority={task.priority} onChange={(p) => onInlineUpdate?.(task, { priority: p })} />
        ) : (
          <span className="text-xs text-[var(--text-secondary)]">{task.priority || 'None'}</span>
        )}
      </span>

      <span className="hidden sm:flex items-center justify-center px-2 border-r border-[var(--border-subtle)]/30" onClick={(e) => e.stopPropagation()}>
        {canManage ? (
          <DueDateCell value={task.deadline_datetime} overdue={overdue} onChange={(d) => onInlineUpdate?.(task, { deadline_datetime: d })} />
        ) : (
          <span className={cn('text-xs tabular-nums', overdue ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-secondary)]')}>{formatDate(task.deadline_datetime)}</span>
        )}
      </span>

      <span className="hidden items-center justify-center tabular-nums text-xs text-[var(--text-secondary)] sm:flex px-2">
        {Math.round(Math.max(0, Math.min(100, Number(task.progress_rate ?? task.completion_rate ?? 0))))}%
      </span>
    </div>
  );
}
