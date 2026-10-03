import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Trash2, X, UserPlus, Building2, Users, Briefcase } from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import { cn } from '@/lib/utils';

const BUSINESS_CATEGORIES = [
  { value: 'none', label: 'None' },
  { value: 'local_seo', label: 'Local SEO' },
  { value: 'full_seo', label: 'Full SEO' },
  { value: 'va', label: 'VA' },
  { value: 'orders', label: 'Orders' },
];

const STATUS_TOKENS = {
  Pending: 'var(--ppm-st-pending)',
  'In Progress': 'var(--ppm-st-in-progress)',
  Completed: 'var(--ppm-st-completed)',
  Overdue: 'var(--ppm-st-overdue)',
  Cancelled: 'var(--ppm-st-cancelled)',
  Archived: 'var(--ppm-status-muted, var(--text-muted))',
};

const BUSINESS_STATUS_STYLES = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  inactive: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  stopped: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  archived: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const BUSINESS_STATUS_LABEL = {
  active: 'Active',
  inactive: 'Inactive',
  paused: 'Paused',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

const BUSINESS_STATUS_OPTIONS = [
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'paused', label: 'Paused' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'archived', label: 'Archived' },
];

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

function BusinessMovePopover({ businesses, onMove }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  const filtered = (businesses || []).filter((b) => !query || (b.name || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
      >
        <Building2 size={13} className="text-[var(--text-muted)]" />
        Move to business
        <ChevronDown size={12} className="text-[var(--text-muted)]" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl">
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
            {filtered.length === 0 && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">No businesses found</p>}
             {filtered.map((b) => (
               <button
                 key={b.id}
                 type="button"
                 onClick={() => { onMove?.(b.id); setOpen(false); }}
                 className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]"
               >
                 <Building2 size={12} className="shrink-0 text-[var(--text-muted)]" />
                 <span className="truncate text-[var(--text-primary)]">{b.name}</span>
                 {b.status && (
                   <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${BUSINESS_STATUS_STYLES[b.status] || BUSINESS_STATUS_STYLES.inactive}`}>
                     {BUSINESS_STATUS_LABEL[b.status] || b.status}
                   </span>
                 )}
               </button>
             ))}
          </div>
        </div>
      )}
    </span>
  );
}

export default function BulkActionBar({
  count,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onClear,
  isAllBusinessesSelected,
  onToggleSelectAllBusinesses,
  selectedBusinessIds = new Set(),
  selectedTaskIds = new Set(),
  displayedTaskCount = 0,
  onSelectAllTasks,
  onAssigneeChange,
  onAssignToSelectedBusinesses,
  onMoveToBusiness,
  businesses,
  canManageTasks = false,
  userRole = '',
  onUpdateBusinessStatus,
  onUpdateBusinessService,
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [tab, setTab] = useState('user');
  const [serviceOpen, setServiceOpen] = useState(false);
  const assignRef = useRef(null);

  useEffect(() => {
    if (!assignOpen) return;
    let active = true;
    const timer = setTimeout(async () => {
      if (tab === 'user') {
        setLoadingUsers(true);
        try {
          const results = await getUsersForAssignment(query);
          if (active) setUsers(results);
        } catch {
          if (active) setUsers([]);
        } finally {
          if (active) setLoadingUsers(false);
        }
      } else {
        setLoadingDepts(true);
        try {
          const results = await getDepartmentsForAssignment(query);
          if (active) setDepartments(results);
        } catch {
          if (active) setDepartments([]);
        } finally {
          if (active) setLoadingDepts(false);
        }
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [assignOpen, query, tab]);

  useEffect(() => {
    if (!assignOpen) return;
    const onClick = (e) => { if (assignRef.current && !assignRef.current.contains(e.target)) setAssignOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [assignOpen]);

  const pickAssignee = useCallback((option) => {
    const assignment = tab === 'user'
      ? { assignment_type: 'User', reference_id: String(option.id), reference_name: option.full_name }
      : { assignment_type: 'Department', reference_id: String(option.id), reference_name: option.name };
    if (selectedBusinessIds.size > 0) {
      onAssignToSelectedBusinesses?.(assignment);
    } else {
      onAssigneeChange?.([assignment]);
    }
    setAssignOpen(false);
    setQuery('');
  }, [onAssigneeChange, onAssignToSelectedBusinesses, selectedBusinessIds.size, tab]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
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

        {selectedBusinessIds.size > 0 ? (
          <button
            type="button"
            onClick={onToggleSelectAllBusinesses}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
          >
            {isAllBusinessesSelected ? 'Deselect all businesses' : 'Select all businesses'}
          </button>
        ) : (
          <button
            type="button"
            onClick={selectedTaskIds.size === displayedTaskCount && displayedTaskCount > 0 ? onClear : onSelectAllTasks}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
          >
            {selectedTaskIds.size === displayedTaskCount && displayedTaskCount > 0 ? 'Deselect all tasks' : 'Select all tasks'}
          </button>
        )}

        <span className="h-5 w-px bg-[var(--border)]" />

        {selectedBusinessIds.size === 0 && (
          <Popover label="Status">
            {TASK_STATUSES.map((s) => (
              <MenuItem key={s} onClick={() => onStatusChange?.(s)}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_TOKENS[s] }} />
                {s}
              </MenuItem>
            ))}
          </Popover>
        )}

        {selectedBusinessIds.size === 0 && (
          <Popover label="Priority">
            {TASK_PRIORITIES.map((p) => (
              <MenuItem key={p} onClick={() => onPriorityChange?.(p)}>
                {p}
              </MenuItem>
            ))}
          </Popover>
        )}

        {selectedBusinessIds.size === 0 && selectedTaskIds.size > 0 && canManageTasks && (
          <>
            <span className="h-5 w-px bg-[var(--border)]" />
            <BusinessMovePopover
              businesses={businesses}
              onMove={onMoveToBusiness}
            />
          </>
        )}

        {selectedBusinessIds.size > 0 && <span className="h-5 w-px bg-[var(--border)]" />}

        {selectedBusinessIds.size > 0 && onUpdateBusinessStatus && (
          <Popover label="Business Status">
            {BUSINESS_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s.key} onClick={() => onUpdateBusinessStatus?.(s.key)}>
                <span className={`mr-2 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${BUSINESS_STATUS_STYLES[s.key] || BUSINESS_STATUS_STYLES.inactive}`}>
                  {s.label}
                </span>
              </MenuItem>
            ))}
          </Popover>
        )}

        {selectedBusinessIds.size > 0 && onUpdateBusinessService && (
          <Popover label="Service">
            {BUSINESS_CATEGORIES.filter((c) => c.value !== 'none').map((c) => (
              <MenuItem key={c.value} onClick={() => { onUpdateBusinessService?.(c.value); setServiceOpen(false); }}>
                <Briefcase size={13} className="text-[var(--text-muted)]" />
                {c.label}
              </MenuItem>
            ))}
          </Popover>
        )}

        <span ref={assignRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setAssignOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
          >
            <UserPlus size={13} className="text-[var(--text-muted)]" />
            {selectedBusinessIds.size > 0 ? `Assign business (${selectedBusinessIds.size})` : selectedTaskIds.size > 0 ? `Assignee (${selectedTaskIds.size})` : 'Assignee'}
            <ChevronDown size={12} className="text-[var(--text-muted)]" />
          </button>
          {assignOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-2 shadow-xl">
              <div className="flex gap-1 px-2 pb-1">
                <button type="button" onClick={() => { setTab('user'); setQuery(''); setUsers([]); setDepartments([]); }} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors', tab === 'user' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]')}>
                  <Users size={12} /> People
                </button>
                <button type="button" onClick={() => { setTab('department'); setQuery(''); setUsers([]); setDepartments([]); }} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors', tab === 'department' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]')}>
                  <Building2 size={12} /> Departments
                </button>
              </div>
              <div className="px-2 pb-1">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tab === 'user' ? 'Search users...' : 'Search departments...'}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="max-h-40 overflow-y-auto px-1">
                {tab === 'user' && (
                  <>
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
                  </>
                )}
                {tab === 'department' && (
                  <>
                    {loadingDepts && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">Searching...</p>}
                    {!loadingDepts && departments.length === 0 && <p className="px-2 py-1 text-xs text-[var(--text-muted)]">No results</p>}
                    {departments.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => pickAssignee(d)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-[var(--bg-surface-hover)]"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <Building2 size={12} />
                        </span>
                        <span className="truncate text-[var(--text-primary)]">{d.name}</span>
                        {d.code && <span className="ml-auto shrink-0 text-[10px] text-[var(--text-muted)]">{d.code}</span>}
                      </button>
                    ))}
                  </>
                )}
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
          {selectedBusinessIds.size > 0 ? 'Delete business' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
