import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Trash2, X, UserPlus } from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import { getUsersForAssignment } from '../api/assignment.api';

const STATUS_TOKENS = {
  Pending: 'var(--ppm-st-pending)',
  'In Progress': 'var(--ppm-st-in-progress)',
  Completed: 'var(--ppm-st-completed)',
  Overdue: 'var(--ppm-st-overdue)',
  Cancelled: 'var(--ppm-st-cancelled)',
};

function Popover({ label, icon: Icon, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
      >
        {Icon && <Icon size={13} className="text-[var(--text-muted)]" />}
        {label}
        <ChevronDown size={12} className="text-[var(--text-muted)]" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl">
          {children}
        </div>
      )}
    </span>
  );
}

function MenuItem({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
    >
      {children}
    </button>
  );
}

export default function BulkActionBar({
  count,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDelete,
  onClear,
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const assignRef = useRef(null);

  useEffect(() => {
    if (!assignOpen) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const results = await getUsersForAssignment(query);
        if (active) setUsers(results);
      } catch {
        if (active) setUsers([]);
      } finally {
        if (active) setLoadingUsers(false);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [assignOpen, query]);

  useEffect(() => {
    if (!assignOpen) return;
    const onClick = (e) => { if (assignRef.current && !assignRef.current.contains(e.target)) setAssignOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [assignOpen]);

  const pickAssignee = useCallback((user) => {
    onAssigneeChange?.([
      { assignment_type: 'User', reference_id: String(user.id), reference_name: user.full_name },
    ]);
    setAssignOpen(false);
    setQuery('');
  }, [onAssigneeChange]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 shadow-2xl">
        <span className="text-xs font-medium text-[var(--text-primary)]">
          {count} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="Clear selection"
        >
          <X size={14} />
        </button>

        <span className="h-5 w-px bg-[var(--border)]" />

        <Popover label="Status">
          {TASK_STATUSES.map((s) => (
            <MenuItem key={s} onClick={() => onStatusChange?.(s)}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_TOKENS[s] }} />
              {s}
            </MenuItem>
          ))}
        </Popover>

        <Popover label="Priority">
          {TASK_PRIORITIES.map((p) => (
            <MenuItem key={p} onClick={() => onPriorityChange?.(p)}>
              {p}
            </MenuItem>
          ))}
        </Popover>

        <span ref={assignRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setAssignOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
          >
            <UserPlus size={13} className="text-[var(--text-muted)]" />
            Assignee
            <ChevronDown size={12} className="text-[var(--text-muted)]" />
          </button>
          {assignOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-2 shadow-xl">
              <div className="px-2 pb-1">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="max-h-40 overflow-y-auto px-1">
                {loadingUsers && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">Searching...</p>}
                {!loadingUsers && users.length === 0 && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">No results</p>}
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => pickAssignee(u)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]"
                  >
                    <span className="h-5 w-5 shrink-0 rounded-full bg-[var(--bg-surface-hover)] text-[9px] font-medium text-[var(--text-secondary)] flex items-center justify-center">
                      {(u.full_name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate text-[var(--text-primary)]">{u.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </span>

        <span className="h-5 w-px bg-[var(--border)]" />

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}
