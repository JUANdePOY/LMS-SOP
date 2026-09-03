import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Copy, FolderInput, Trash2, MoreHorizontal, Calendar, ExternalLink, UserPlus, Link2, ListTodo, Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_PRIORITIES, TASK_PRIORITY_DOT } from '../constants/taskConstants';
import { useClickOutside } from '../hooks/useClickOutside';
import { getUsersForAssignment, getDepartmentsForAssignment, getAssignmentScope } from '../api/assignment.api';
import api from '@/services/api';
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
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    updatePosition();
    // The status/priority cells live inside a horizontally-scrolling table.
    // Without a scroll listener the dropdown stays pinned to the viewport
    // position it was opened at, so it detaches from its trigger ("stuck" on
    // screen) as soon as the user scrolls. Recompute on every scroll; if the
    // trigger has scrolled out of the viewport, close instead of floating.
    const onScroll = (e) => {
      if (ref.current && e.target && ref.current.contains(e.target)) return;
      const el = triggerRef.current;
      if (!el) { setOpen(false); return; }
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        setOpen(false);
        return;
      }
      setCoords({ top: rect.bottom + 4, left: rect.left });
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <span ref={ref} className="relative inline-block">
      <button ref={triggerRef} type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="rounded px-1 py-0.5 hover:bg-[var(--bg-surface-hover)]">
        {status ? <StatusDot status={status} /> : <span className="text-xs text-[var(--text-muted)]">Set status</span>}
      </button>
      {open && createPortal(
        <div
          ref={ref}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-36 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl"
        >
          {Object.keys(STATUS_TOKENS).map((s) => (
            <button key={s} type="button" onClick={(e) => { e.stopPropagation(); onChange?.(s); setOpen(false); }} className="flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
              <StatusDot status={s} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </span>
  );
}

function PriorityDropdown({ priority, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const triggerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    updatePosition();
    // Same scroll-repositioning as StatusDropdown — these cells live inside a
    // horizontally-scrolling table, so a one-shot position capture leaves the
    // dropdown "stuck" at a stale viewport spot once the table scrolls.
    const onScroll = (e) => {
      if (ref.current && e.target && ref.current.contains(e.target)) return;
      const el = triggerRef.current;
      if (!el) { setOpen(false); return; }
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        setOpen(false);
        return;
      }
      setCoords({ top: rect.bottom + 4, left: rect.left });
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <span ref={ref} className="relative inline-block">
      <button ref={triggerRef} type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]">
        <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_DOT[priority] || TASK_PRIORITY_DOT.Medium)} />
        {priority || 'None'}
        <ChevronDown size={10} className="text-[var(--text-muted)]" />
      </button>
      {open && createPortal(
        <div
          ref={ref}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 60 }}
          className="w-32 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl"
        >
          {TASK_PRIORITIES.map((p) => (
            <button key={p} type="button" onClick={(e) => { e.stopPropagation(); onChange?.(p); setOpen(false); }} className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-surface-hover)]', p === priority && 'font-semibold')}>
              <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_DOT[p])} />
              {p}
            </button>
          ))}
        </div>,
        document.body
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

export function Avatar({ name, avatarUrl, size = 20, className = '' }) {
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
  const [tab, setTab] = useState('people');
  const [scope, setScope] = useState(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 224 });
  const [maxHeight, setMaxHeight] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const VIEWPORT_MARGIN = 8;

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
    // Re-derive the fixed position on every scroll so the picker stays
    // attached to its trigger even when the table scrolls horizontally
    // (the assignee cell lives inside the same overflow-x-auto container as
    // the status/priority cells). If the trigger has scrolled out of the
    // viewport, close instead of leaving a floating picker.
    const handleScroll = (e) => {
      if (dropdownRef.current && e.target && dropdownRef.current.contains(e.target)) return;
      const el = triggerRef.current;
      if (!el) { setOpen(false); return; }
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        setOpen(false);
        return;
      }
      updatePosition();
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
        if (tab === 'people') {
          const results = await getUsersForAssignment(query);
          if (active) setOptions(results);
        } else {
          const results = await getDepartmentsForAssignment(query);
          if (active) setOptions(results);
        }
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [open, query, tab]);

  useEffect(() => {
    if (open && !scope) {
      getAssignmentScope().then((s) => setScope(s)).catch(() => {});
    }
  }, [open, scope]);

  const currentUsers = (assignments || []).filter((a) => a.assignment_type === 'User');
  const currentDepts = (assignments || []).filter((a) => a.assignment_type === 'Department');
  const assignedUserIds = new Set(currentUsers.map((u) => String(u.reference_id)));
  const assignedDeptIds = new Set(currentDepts.map((d) => String(d.reference_id)));
  const selectableOptions = tab === 'people'
    ? options.filter((u) => !assignedUserIds.has(String(u.id)))
    : options.filter((d) => !assignedDeptIds.has(String(d.id)));

  const selectUser = (user) => {
    const userId = String(user.id);
    if (currentUsers.some((a) => String(a.reference_id) === userId)) {
      setQuery('');
      return;
    }
    const next = [...currentUsers, ...currentDepts, { assignment_type: 'User', reference_id: userId, reference_name: user.full_name, avatar_url: user.avatar_url }];
    onSave(next);
    setQuery('');
  };

  const selectDepartment = (dept) => {
    const deptId = String(dept.id);
    if (currentDepts.some((d) => String(d.reference_id) === deptId)) {
      setQuery('');
      return;
    }
    const next = [...currentUsers, ...currentDepts, { assignment_type: 'Department', reference_id: deptId, reference_name: dept.name }];
    onSave(next);
    setQuery('');
  };

  const removeAssignment = (refId) => {
    const next = (assignments || []).filter((a) => String(a.reference_id) !== String(refId));
    onSave(next);
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setQuery('');
    setOptions([]);
  };

  const totalAssigned = currentUsers.length + currentDepts.length;
  const MAX_VISIBLE = 3;
  const visibleUsers = currentUsers.slice(0, MAX_VISIBLE);
  const extra = totalAssigned - MAX_VISIBLE;
  const allNames = [...currentDepts.map((d) => d.reference_name), ...currentUsers.map((u) => u.reference_name)].join(', ');
  const nameLabel = totalAssigned === 0
    ? ''
    : totalAssigned === 1
      ? (currentDepts[0]?.reference_name || currentUsers[0]?.reference_name)
      : `${currentDepts[0]?.reference_name || currentUsers[0]?.reference_name} +${totalAssigned - 1}`;

  const avatarStack = (
    <span className="flex items-center -space-x-2">
      {currentDepts.slice(0, MAX_VISIBLE).map((d) => (
        <span key={`dept-${d.reference_id}`} className="relative flex items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[9px] font-medium text-[var(--color-primary)] ring-2 ring-[var(--bg-surface)]" style={{ width: 22, height: 22 }}>
          <Building2 size={12} />
        </span>
      ))}
      {currentUsers.slice(0, MAX_VISIBLE - currentDepts.length).map((u) => (
        <span key={`user-${u.reference_id}`} className="relative overflow-hidden rounded-full ring-2 ring-[var(--bg-surface)]">
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
        title={totalAssigned ? allNames : 'Assign'}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          'group/asn inline-flex max-w-full items-center gap-1 overflow-hidden rounded-md py-0.5 pl-0.5 pr-1 transition-colors hover:bg-[var(--bg-surface-hover)]',
          buttonClassName
        )}
      >
        {alwaysAdd ? addControl : totalAssigned === 0 ? emptyState : (
          <>
            {avatarStack}
            <span className="ml-1 min-w-0 truncate text-xs text-[var(--text-secondary)]">{nameLabel}</span>
          </>
        )}
        {!alwaysAdd && totalAssigned > 0 && (
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
          <div className="flex shrink-0 gap-1 border-b border-[var(--border)] px-2 pb-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); switchTab('people'); }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                tab === 'people' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
              )}
            >
              <Users size={12} />
              People
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); switchTab('departments'); }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                tab === 'departments' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
              )}
            >
              <Building2 size={12} />
              Departments
            </button>
          </div>
          <div className="shrink-0 px-2 pt-2 pb-1">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'people'
                ? (scope?.role === 'department_head' ? 'Search people in your department...' : 'Search people...')
                : 'Search departments...'}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            {loading && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">Searching...</p>}
            {!loading && selectableOptions.length === 0 && (
              <p className="px-2 py-1 text-xs text-[var(--text-muted)]">
                {options.length === 0 ? 'No results' : (tab === 'people' ? 'All matched employees already assigned' : 'All matched departments already assigned')}
              </p>
            )}
            {tab === 'people' && selectableOptions.map((u) => (
              <button key={u.id} type="button" onClick={(e) => { e.stopPropagation(); selectUser(u); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
                <Avatar name={u.full_name} avatarUrl={u.avatar_url} />
                <span className="truncate text-[var(--text-primary)]">{u.full_name}</span>
              </button>
            ))}
            {tab === 'departments' && selectableOptions.map((d) => (
              <button key={d.id} type="button" onClick={(e) => { e.stopPropagation(); selectDepartment(d); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Building2 size={12} />
                </span>
                <span className="truncate text-[var(--text-primary)]">{d.name}</span>
                {d.code && <span className="ml-auto shrink-0 text-[10px] text-[var(--text-muted)]">{d.code}</span>}
              </button>
            ))}
          </div>
          {totalAssigned > 0 && (
            <div className="mt-1 shrink-0 border-t border-[var(--border)] px-2 pt-1">
              {currentDepts.map((a) => (
                <div key={`dept-${a.reference_id}`} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <Building2 size={12} />
                    </span>
                    <span className="truncate text-xs text-[var(--text-secondary)]">{a.reference_name}</span>
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeAssignment(a.reference_id); }} className="shrink-0 text-[var(--text-muted)] hover:text-red-500" aria-label={`Remove ${a.reference_name}`}>
                    <span className="text-xs">×</span>
                  </button>
                </div>
              ))}
              {currentUsers.map((a) => (
                <div key={`user-${a.reference_id}`} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={a.reference_name} avatarUrl={a.avatar_url} />
                    <span className="truncate text-xs text-[var(--text-secondary)]">{a.reference_name}</span>
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeAssignment(a.reference_id); }} className="shrink-0 text-[var(--text-muted)] hover:text-red-500" aria-label={`Remove ${a.reference_name}`}>
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
  const currentDepts = (assignments || []).filter((a) => a.assignment_type === 'Department');
  if (currentUsers.length === 0 && currentDepts.length === 0) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }
  const MAX_VISIBLE = 3;
  const total = currentUsers.length + currentDepts.length;
  const visibleDepts = currentDepts.slice(0, MAX_VISIBLE);
  const visibleUsers = currentUsers.slice(0, MAX_VISIBLE - currentDepts.length);
  const extra = total - Math.min(total, MAX_VISIBLE);
  const allNames = [...currentDepts.map((d) => d.reference_name), ...currentUsers.map((u) => u.reference_name)].join(', ');
  return (
    <span className="flex items-center -space-x-2" title={allNames}>
      {visibleDepts.map((d) => (
        <span key={`dept-${d.reference_id}`} className="relative flex items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[9px] font-medium text-[var(--color-primary)] ring-2 ring-[var(--bg-surface)]" style={{ width: 22, height: 22 }}>
          <Building2 size={12} />
        </span>
      ))}
      {visibleUsers.map((u) => (
        <span key={`user-${u.reference_id}`} className="relative overflow-hidden rounded-full ring-2 ring-[var(--bg-surface)]">
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

// Business-manager picker. A "business manager" is granted management access
// to every task in a client business unit (see /api/client-businesses/:id/managers).
// This picker lets an admin pick users to grant that access to the business
// row the assignees column belongs to.
export function BusinessManagerPicker({ businessId, businessName, managers, onSave, canManage = true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 224 });
  const [maxHeight, setMaxHeight] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const VIEWPORT_MARGIN = 8;

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
      const el = triggerRef.current;
      if (!el) { setOpen(false); return; }
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        setOpen(false);
        return;
      }
      updatePosition();
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
    if (justSelected) { setJustSelected(false); return; }
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/client-businesses/${businessId}/managers/available`, {
          params: { search: query, limit: 100 },
        });
        if (active) setOptions(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [businessId, query, justSelected]);

  const grantedIds = new Set((managers || []).map((m) => String(m.user_id)));
  const selectable = options.filter((u) => !grantedIds.has(String(u.id)));

  const grant = (user) => {
    setJustSelected(true);
    setQuery('');
    setOptions([]);
    onSave?.(user);
  };

  const totalGranted = (managers || []).length;
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
        title={totalGranted ? `${totalGranted} manager${totalGranted === 1 ? '' : 's'}` : 'Assign manager'}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        disabled={!canManage}
        className={cn(
          'group/bm inline-flex max-w-full items-center gap-1 overflow-hidden rounded-md py-0.5 pl-0.5 pr-1 transition-colors hover:bg-[var(--bg-surface-hover)]',
          !canManage && 'cursor-not-allowed opacity-60'
        )}
      >
        {totalGranted === 0 ? emptyState : (
          <span className="flex items-center -space-x-2">
            {managers.slice(0, 3).map((m) => (
              <span key={m.user_id} className="relative overflow-hidden rounded-full ring-2 ring-[var(--bg-surface)]">
                <Avatar name={m.full_name} avatarUrl={m.avatar_url} size={22} />
              </span>
            ))}
            {totalGranted > 3 && (
              <span
                className="flex items-center justify-center rounded-full bg-[var(--bg-surface-hover)] text-[10px] font-medium text-[var(--text-secondary)] ring-2 ring-[var(--bg-surface)]"
                style={{ width: 22, height: 22 }}
              >
                +{totalGranted - 3}
              </span>
            )}
          </span>
        )}
        {canManage && totalGranted > 0 && (
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 ring-1 ring-[var(--border)] transition-opacity group-hover/bm:opacity-100">
            <UserPlus size={13} />
          </span>
        )}
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, maxHeight, zIndex: 60 }}
          className="flex max-h-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-2 shadow-xl"
        >
          <div className="shrink-0 px-2 pb-1">
            <p className="truncate text-xs font-medium text-[var(--text-primary)]">{businessName || 'Business'}</p>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users to grant manager access..."
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            {loading && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">Searching...</p>}
            {!loading && selectable.length === 0 && (
              <p className="px-2 py-1 text-xs text-[var(--text-muted)]">
                {options.length === 0 ? 'No users found' : 'All matched users already granted'}
              </p>
            )}
            {selectable.map((u) => (
              <button key={u.id} type="button" onClick={(e) => { e.stopPropagation(); grant(u); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
                <Avatar name={u.full_name} avatarUrl={u.avatar_url} size={22} />
                <span className="truncate text-[var(--text-primary)]">{u.full_name}</span>
              </button>
            ))}
          </div>
          {totalGranted > 0 && (
            <div className="mt-1 shrink-0 border-t border-[var(--border)] px-2 pt-1">
              <p className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Granted access</p>
              {managers.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={m.full_name} avatarUrl={m.avatar_url} size={20} />
                    <span className="truncate text-xs text-[var(--text-secondary)]">{m.full_name}</span>
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onSave?.({ revoke: true, user_id: m.user_id }); }} className="shrink-0 text-[var(--text-muted)] hover:text-red-500" aria-label={`Revoke ${m.full_name}`}>
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

// Move-to-business picker. Tasks live directly under a client business unit
// (the project layer has been removed), so "moving" a task means reassigning
// its client_id + client_business_id to a different business unit. The options
// are the full Client -> Business skeleton flattened from the org tree, which
// is exactly what the hierarchy table groups by.
function MoveToBusinessPicker({ businesses, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const ref = useClickOutside(onClose);

  const filtered = businesses.filter((b) =>
    !query || (b.name || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-2 shadow-xl">
      <div className="px-2 pb-1">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search businesses..."
          className="w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div className="max-h-36 overflow-y-auto px-1">
        {filtered.length === 0 && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">No businesses</p>}
        {filtered.map((b) => (
          <button key={b.id} type="button" onClick={(e) => { e.stopPropagation(); onSelect(b); onClose(); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]">
            <Building2 size={12} className="shrink-0 text-[var(--text-muted)]" />
            <span className="truncate text-[var(--text-primary)]">{b.name}</span>
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

/**
 * Inline "add task" row rendered directly under a business unit. It mirrors a
 * real TaskRow cell-for-cell (name · assignees · status · priority · due ·
 * progress) so the new task can be fully specified inline — no modal. On
 * commit it hands the parent the complete payload (title, status, priority,
 * deadline, assignees, client/business scope) to create.
 */
export function AddTaskRow({ businessId, clientId, canManage = true, projects = {}, onCommit, onCancel, userDepartmentId = null, userDepartmentClientIds = null }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Medium');
  const [deadline, setDeadline] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const commit = async () => {
    const next = title.trim();
    if (!next) { onCancel?.(); return; }
    setSubmitting(true);
    try {
      await onCommit({
        title: next,
        status,
        priority,
        deadline_datetime: deadline,
        assignments,
        client_id: clientId ?? null,
        client_business_id: businessId ?? null,
      });
      setTitle('');
      setStatus('Pending');
      setPriority('Medium');
      setDeadline(null);
      setAssignments([]);
    } catch {
      // Parent surfaces its own error toast; keep the row open so the user can retry.
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssigneeSave = (next) => setAssignments(next);

  return (
    <div
      role="row"
      className={cn(
        'grid h-10 gap-0 border-b-[0.5px] border-neutral-300/70 dark:border-neutral-600/75 bg-[var(--bg-surface)] px-2 text-sm',
        HIERARCHY_GRID
      )}
    >
      <span className="relative z-10 flex min-w-0 items-center justify-between gap-1.5 pr-2 border-r-[0.5px] border-neutral-500/60 dark:border-neutral-700/60" style={{ paddingLeft: '4px' }}>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)] opacity-40" aria-hidden="true" />
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') { e.preventDefault(); onCancel?.(); }
            }}
            onBlur={() => { if (title.trim()) commit(); else onCancel?.(); }}
            placeholder="New task name…"
            className="min-w-0 flex-1 rounded border border-[var(--color-primary)] bg-[var(--bg-page)] px-2 py-1 text-sm outline-none"
          />
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={commit} disabled={!title.trim() || submitting} className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? 'Adding…' : 'Add'}
          </button>
          <button type="button" onClick={() => onCancel?.()} className="rounded px-1.5 py-0.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]">Cancel</button>
        </span>
      </span>

      <span className="hidden min-w-0 items-center justify-center overflow-hidden sm:flex px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        {canManage ? (
          <AssigneePicker assignments={assignments} onSave={handleAssigneeSave} alwaysAdd />
        ) : (
          <ReadOnlyAssignees assignments={assignments} />
        )}
      </span>

      <span className="flex items-center justify-center px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        <StatusDropdown status={status} onChange={(s) => setStatus(s)} />
      </span>

      <span className="hidden sm:flex items-center justify-center px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        <PriorityDropdown priority={priority} onChange={(p) => setPriority(p)} />
      </span>

      <span className="hidden sm:flex items-center justify-center px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        <DueDateCell value={deadline} onChange={(d) => setDeadline(d)} />
      </span>

      <span className="hidden items-center justify-center tabular-nums text-xs text-[var(--text-secondary)] sm:flex px-2">
        0%
      </span>
    </div>
  );
}

function MoreActionsMenu({ task, businesses, onOpen, onMoveBusiness, onDelete, onDuplicate, onAddSubtask, canManage = true }) {
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
      const ddWidth = dd ? dd.offsetWidth : MENU_W;
      const ddHeight = dd ? dd.offsetHeight : 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = ddHeight > spaceBelow && rect.top > spaceBelow;
      let top = flipUp ? rect.top - ddHeight - 4 : rect.bottom + 4;
      top = Math.max(MARGIN, Math.min(top, window.innerHeight - ddHeight - MARGIN));
      // Right-anchor the subview (delete/move) so it sits flush against the
      // trigger. `right` is the distance from the viewport's right edge to the
      // trigger's right edge; the dropdown keeps its left-anchored positioning.
      setCoords({ top, right: window.innerWidth - rect.right, left: rect.right - MENU_W });
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
    <div ref={dropdownRef} data-portal="task-row-actions" className="fixed z-50 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl" style={{ top: coords.top, left: coords.left }}>
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
            <Building2 size={13} /> Move to business
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
    <div ref={dropdownRef} data-portal="task-row-actions" className="fixed z-50" style={{ top: coords.top, left: coords.left }}>
      {children}
    </div>
  );

  return (
    <>
      {trigger}
      {createPortal(
        subview === 'delete' ? panel(<InlineDeleteConfirm onConfirm={() => { onDelete(task); close(); }} onCancel={() => setSubview(null)} />)
          : subview === 'move' ? panel(<MoveToBusinessPicker businesses={businesses} onSelect={(b) => onMoveBusiness(task, b)} onClose={() => setSubview(null)} />)
            : menu,
        document.body
      )}
    </>
  );
}

export function TaskRow({ task, dimmed, onViewTask, onStatusChange, onInlineUpdate, onDelete, onDeleteImmediate, onDuplicated, onRenameTask, canManage, projects, showCountBadges = false, subtaskCount = 0, isNew = false, tasksById = {}, onAddSubtask, onViewSubtasks, userDepartmentId = null, userDepartmentClientIds = null }) {
  const { toast } = useToast();

  const overdue = isOverdue(task);

  // Flattened Client -> Business list for the "Move to business" picker. Tasks
  // live directly under a client business unit (the project layer has been
  // removed), so every business option is built from the projects already
  // loaded by TasksPage — each project carries its owning client + business.
  // This is the same Client -> Business skeleton the hierarchy table groups by.
  const businesses = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const p of Object.values(projects || {})) {
      const bid = p.client_business_id ?? p.business_id;
      if (bid == null) continue;
      const key = String(bid);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        id: bid,
        name: p.client_business_name || p.business_name || `Business ${bid}`,
        clientId: p.client_id ?? null,
        clientName: p.client_name ?? null,
      });
    }
    return list;
  }, [projects]);

  // Department Heads can edit all tasks in their department. If userDepartmentId
  // is provided, restrict canManage to tasks that have a Department-type
  // assignment matching it, OR tasks associated with a client in the department
  // (via userDepartmentClientIds). Admins/super_admins (no userDepartmentId passed)
  // retain full canManage.
  const taskDeptIds = new Set(
    (task.assignments || [])
      .filter((a) => a.assignment_type === 'Department')
      .map((a) => String(a.reference_id))
  );
  // Resolve the task's client ID to check against userDepartmentClientIds
  const taskClientId = String(
    task.client_id ?? (() => {
      const pid = task.project_id ?? task.projectId ?? task.project?.id;
      const proj = pid != null ? projects?.[String(pid)] : null;
      return proj?.client_id ?? null;
    })() ?? null
  );
  const baseManage = canManage && (userDepartmentId == null || taskDeptIds.has(String(userDepartmentId)) || (userDepartmentClientIds != null && userDepartmentClientIds.has(taskClientId)));
  // Inline field edits (status, priority, due date, title, complete toggle)
  // are allowed for admins, department heads, task creators, direct assignees,
  // OR any user granted business-manager access to this task's business. The
  // server flags that grant on the task payload as `can_edit`, so an employee
  // assigned to the business (client) can edit these cells inline even when
  // they aren't individually assigned to the task.
  const canEditThisTask = baseManage || Boolean(task.can_edit);
  // Administration (assignees, delete, move, duplicate, add sub-task) stays with
  // admins / department heads only — a business manager cannot reassign or
  // remove tasks, even for the business they manage.
  const canAdminister = baseManage;

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

  const handleMoveBusiness = (t, business) => {
    onInlineUpdate?.(t, {
      client_id: business.clientId,
      client_business_id: business.id,
      client_name: business.clientName,
      client_business_name: business.name,
      // The project layer has been removed, so moving a task off its project
      // keeps it in the same client/business branch.
      project_id: null,
    });
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
        // Don't open the detail panel when the click lands on the action
        // menu/inline confirm. Those controls are rendered through a portal to
        // document.body, so their DOM ancestors have no [data-no-nav] — the
        // React synthetic event still bubbles up to this row. Mark the portal
        // containers with [data-portal] so the guard can find them regardless
        // of where they live in the DOM.
        if (e.target.closest('[data-no-nav]')) return;
        if (e.target.closest('[data-portal="task-row-actions"]')) return;
        onViewTask?.(task);
      }}
      className={cn(
        'group grid h-10 gap-0 cursor-pointer overflow-hidden border-t-[0.5px] border-b-[0.5px] border-neutral-300/70 dark:border-neutral-600/75 px-2 text-sm transition-colors',
        HIERARCHY_GRID,
        'hover:bg-[var(--bg-surface-hover)]',
        dimmed && 'opacity-40'
      )}
    >
      <span
        className="relative z-10 flex min-w-0 items-center justify-between gap-1.5 pr-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75"
        style={{ paddingLeft: '4px' }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={handleCompleteToggle}
          disabled={!canEditThisTask}
          aria-pressed={task.status === 'Completed'}
          className={cn(
            'grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150 ease-out motion-reduce:transition-none',
            task.status === 'Completed'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--border)] hover:border-[var(--color-primary)]',
            !canEditThisTask && 'cursor-not-allowed opacity-60'
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
            canEdit={canEditThisTask}
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
        </span>
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" data-no-nav>
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
            businesses={businesses}
            canManage={canAdminister}
            onOpen={(t) => onViewTask?.(t)}
            onMoveBusiness={handleMoveBusiness}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onAddSubtask={onAddSubtask}
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

      <span className="hidden min-w-0 items-center justify-center overflow-hidden sm:flex px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        {canAdminister ? (
          <AssigneePicker assignments={task.assignments} onSave={handleAssigneeSave} />
        ) : (
          <ReadOnlyAssignees assignments={task.assignments} />
        )}
      </span>

      <span className="flex items-center justify-center px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        {canEditThisTask ? (
          <StatusDropdown status={task.status} onChange={(s) => onStatusChange?.(task, s)} />
        ) : (
          <StatusDot status={task.status} />
        )}
      </span>

      <span className="hidden sm:flex items-center justify-center px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        {canEditThisTask ? (
          <PriorityDropdown priority={task.priority} onChange={(p) => onInlineUpdate?.(task, { priority: p })} />
        ) : (
          <span className="text-xs text-[var(--text-secondary)]">{task.priority || 'None'}</span>
        )}
      </span>

      <span className="hidden sm:flex items-center justify-center px-2 border-r-[0.5px] border-neutral-300/70 dark:border-neutral-600/75" onClick={(e) => e.stopPropagation()}>
        {canEditThisTask ? (
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
