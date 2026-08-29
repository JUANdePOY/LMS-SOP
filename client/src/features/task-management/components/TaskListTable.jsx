import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Flag, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_STATUSES, TASK_STATUS_ORDER } from '../constants/taskConstants';
import { useClickOutside } from '../hooks/useClickOutside';
import StatusDot from './StatusDot';
import { InlineEditableText } from './TaskInlineControls';
import { AssigneeStack, AssignedCell, RowActionMenu } from './TaskRow';

const GROUP_KEY = 'ppm:tasks:groupby';
const COLLAPSED_KEY = 'ppm:tasks:collapsed-groups';

const GROUP_OPTIONS = [
  { key: 'none', label: 'None' },
  { key: 'status', label: 'Status' },
  { key: 'client', label: 'Client' },
  { key: 'business', label: 'Business' },
  { key: 'project', label: 'Project' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'priority', label: 'Priority' },
];

function groupValue(task, by, projectsById) {
  if (by === 'status') return task.status || 'Pending';
  if (by === 'project') return task.project_name || task.project_id || 'No project';
  if (by === 'assignee') {
    const u = (task.assignments || []).find((a) => a.assignment_type === 'User');
    return u ? u.reference_name : 'Unassigned';
  }
  if (by === 'priority') return task.priority || 'None';
  const project = task.project_id ? projectsById[String(task.project_id)] : null;
  if (by === 'client') {
    return (project?.client_name || task.client_name) || 'No client';
  }
  if (by === 'business') {
    return (project?.client_business_name || task.client_business_name) || 'No business';
  }
  return 'all';
}

function isOverdue(task) {
  const status = task.status || '';
  if (status === 'Completed' || status === 'Cancelled') return false;
  if (!task.deadline_datetime) return false;
  return new Date(task.deadline_datetime).getTime() < Date.now();
}

function progressOf(task) {
  const v = task.completion_rate != null ? task.completion_rate : task.progress_rate;
  return typeof v === 'number' ? v : 0;
}

function subtaskChip(task) {
  if (!task.is_parent) return null;
  const subs = task.subtasks || [];
  const done = subs.filter((s) => (s.status || '') === 'Completed').length;
  return `${done}/${subs.length}`;
}

function PriorityIndicator({ priority }) {
  const color =
    priority === 'Critical' ? 'var(--status-overdue)'
      : priority === 'High' ? 'var(--text-secondary)'
        : 'var(--text-muted)';
  const filled = priority === 'High' || priority === 'Critical';
  return (
    <span className="inline-flex items-center" title={`Priority: ${priority || 'None'}`} aria-label={`Priority: ${priority || 'None'}`}>
      <Flag size={13} style={{ color }} fill={filled ? 'currentColor' : 'none'} />
    </span>
  );
}

function StatusCell({ status, onStatusChange, canManage }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  if (!canManage) return <StatusDot status={status} />;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="inline-flex items-center rounded px-1 py-0.5 -mx-1 hover:bg-[var(--bg-surface-hover)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <StatusDot status={status} />
        <ChevronDown size={12} className="ml-1 text-[var(--text-muted)]" />
      </button>
      {open && (
        <div
          role="listbox"
          onClick={(e) => e.stopPropagation()}
          className="absolute z-30 left-0 top-full mt-1 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl"
        >
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              role="option"
              aria-selected={s === status}
              type="button"
              onClick={() => { onStatusChange(s); setOpen(false); }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-surface-hover)]',
                s === status ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              )}
            >
              <StatusDot status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressCell({ task, onProgressChange, canManage }) {
  const pct = Math.min(100, Math.max(0, progressOf(task)));
  const editable = canManage && onProgressChange;
  const bar = (
    <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
  );
  return (
    <div
      className={cn('flex items-center gap-2 min-w-0', editable && 'cursor-pointer')}
      title={`${pct}% complete`}
      onClick={editable ? (e) => { e.stopPropagation(); onProgressChange(task.id, pct >= 100 ? 0 : Math.min(100, pct + 10)); } : undefined}
    >
      <span className="h-[3px] flex-1 min-w-[44px] overflow-hidden rounded-full bg-[var(--border-subtle)]">
        {bar}
      </span>
      <span className="hidden group-hover:inline text-[11px] tabular-nums text-[var(--text-muted)] w-9 text-right">{pct}%</span>
    </div>
  );
}

function Breadcrumb({ task, projectsById, navigate }) {
  const project = task.project_id ? projectsById[String(task.project_id)] : null;
  const clientName = project?.client_name || task.client_name || null;
  const clientId = project?.client_id ?? task.client_id ?? null;
  const businessName = project?.client_business_name || task.client_business_name || null;
  const businessId = project?.client_business_id ?? task.client_business_id ?? null;
  const projectName = task.project_name || project?.name || null;

  const seg = (label, path, title) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (path) navigate(path); }}
      className="truncate text-[var(--text-secondary)] hover:text-[var(--color-primary)] hover:underline"
      title={title || label}
    >
      {label}
    </button>
  );

  if (!clientName && !businessName && !projectName) {
    return <span className="truncate text-xs text-[var(--text-muted)]">—</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-1 text-xs">
      {clientName && clientId && seg(clientName, `/clients/${clientId}`, `Client: ${clientName}`)}
      {businessName && clientId && businessId && (
        <>
          <span className="text-[var(--text-muted)]">›</span>
          {seg(businessName, `/clients/${clientId}/businesses/${businessId}`, `Business: ${businessName}`)}
        </>
      )}
      {projectName && (
        <>
          <span className="text-[var(--text-muted)]">›</span>
          {seg(projectName, task.project_id ? `/projects/${task.project_id}` : null, `Project: ${projectName}`)}
        </>
      )}
    </div>
  );
}

export default function TaskListTable({
  tasks = [],
  onEdit,
  onDelete,
  onStatusChange,
  onInlineUpdate,
  onCreateTask,
  onViewTask,
  onProgressChange,
  canManage = false,
  projectScoped = false,
  projectsById = {},
  onQuickCreate,
  onBulkAssign,
}) {
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState(() => localStorage.getItem(GROUP_KEY) || 'none');
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '{}'); } catch { return {}; }
  });
  const [selected, setSelected] = useState(() => new Set());

  const setGroup = (v) => { setGroupBy(v); localStorage.setItem(GROUP_KEY, v); };
  const toggleCollapsed = (key) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const topLevel = useMemo(() => (tasks || []).filter((t) => !t.parent_task_id), [tasks]);

  const columns = useMemo(() => {
    const cols = ['36px', 'minmax(220px,1.6fr)'];
    if (!projectScoped) cols.push('210px');
    cols.push('160px', '150px', '90px', '110px', '150px', '40px');
    return cols.join(' ');
  }, [projectScoped]);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'All', tasks: topLevel }];
    const map = new Map();
    topLevel.forEach((t) => {
      const k = groupValue(t, groupBy, projectsById);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    });
    let keys = [...map.keys()];
    if (groupBy === 'status') {
      keys.sort((a, b) => TASK_STATUS_ORDER.indexOf(a) - TASK_STATUS_ORDER.indexOf(b));
    } else {
      keys.sort((a, b) => String(a).localeCompare(String(b)));
    }
    return keys.map((k) => ({ key: k, label: k, tasks: map.get(k) }));
  }, [groupBy, topLevel, projectsById]);

  const visibleIds = useMemo(() => topLevel.map((t) => String(t.id)), [topLevel]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = visibleIds.some((id) => selected.has(id));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  };

  const runBulkStatus = (status) => {
    topLevel.forEach((t) => { if (selected.has(String(t.id))) onStatusChange?.(t, status); });
  };
  const runBulkDelete = () => {
    topLevel.forEach((t) => { if (selected.has(String(t.id))) onDelete?.(t.id); });
    setSelected(new Set());
  };

  const Header = ({ label, className = '' }) => (
    <span className={cn('text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]', className)}>{label}</span>
  );

  const renderRow = (task) => {
    const chip = subtaskChip(task);
    const overdue = isOverdue(task);
    const assignees = (task.assignments || [])
      .filter((a) => a.assignment_type === 'User')
      .map((a) => ({ type: 'User', name: a.reference_name, avatar_url: a.avatar_url }));
    const selectedRow = selected.has(String(task.id));
    return (
      <div
        key={task.id}
        role="row"
        className={cn(
          'group grid items-center gap-3 px-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors duration-150',
          selectedRow && 'bg-[var(--bg-surface-hover)]'
        )}
        style={{ gridTemplateColumns: columns, minHeight: '54px' }}
        onClick={() => onViewTask?.(task)}
      >
        {/* Checkbox */}
        <span className={cn('flex items-center', selectedRow ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity')}>
          <input
            type="checkbox"
            checked={selectedRow}
            onChange={() => toggleSelect(String(task.id))}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select task ${task.title}`}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--color-primary)]"
          />
        </span>

        {/* Title + subtask chip */}
        <div className="min-w-0 flex items-center gap-2">
          {canManage && onInlineUpdate ? (
            <InlineEditableText
              value={task.title}
              onSave={(title) => onInlineUpdate(task, { title })}
              className="truncate font-medium text-[var(--text-primary)] text-sm"
              inputClassName="w-full min-w-0 rounded-md border border-[var(--color-primary)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-sm outline-none"
            />
          ) : (
            <span className="truncate font-medium text-[var(--text-primary)] text-sm">{task.title}</span>
          )}
          {chip && (
            <span className="shrink-0 rounded border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {chip}
            </span>
          )}
        </div>

        {/* Client › Business › Project breadcrumb */}
        {!projectScoped && (
          <div className="min-w-0" title="Client / Business / Project">
            <Breadcrumb task={task} projectsById={projectsById} navigate={navigate} />
          </div>
        )}

        {/* Assignees (inline picker when manageable) */}
        <div className="min-w-0">
          {canManage ? (
            <AssignedCell
              assignments={task.assignments || []}
              onSave={(changes) => onInlineUpdate?.(task, changes)}
            />
          ) : (
            <AssigneeStack items={assignees} />
          )}
        </div>

        {/* Status */}
        <div onClick={(e) => e.stopPropagation()}>
          <StatusCell status={task.status} onStatusChange={(s) => onStatusChange?.(task, s)} canManage={canManage} />
        </div>

        {/* Priority */}
        <div><PriorityIndicator priority={task.priority} /></div>

        {/* Due */}
        <span className={cn('truncate text-xs', overdue ? 'text-[var(--status-overdue)]' : 'text-[var(--text-muted)]')}>
          {task.deadline_datetime
            ? new Date(task.deadline_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : '—'}
        </span>

        {/* Progress */}
        <div onClick={(e) => e.stopPropagation()}>
          <ProgressCell task={task} onProgressChange={onProgressChange} canManage={canManage} />
        </div>

        {/* Row menu */}
        <span className={cn('flex justify-end', selectedRow ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity')}>
          <RowActionMenu onEdit={() => onEdit?.(task)} onDelete={() => onDelete?.(task.id)} canManage={canManage} />
        </span>
      </div>
    );
  };

  const quickAdd = onQuickCreate && (
    <div
      className="group grid items-center gap-3 px-3 border-b border-[var(--border-subtle)]"
      style={{ gridTemplateColumns: columns, minHeight: '50px' }}
    >
      <span />
      <div className="col-span-full -ml-9">
        <input
          type="text"
          placeholder="+ Add task"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const v = e.currentTarget.value.trim();
              if (v) { onQuickCreate(v); e.currentTarget.value = ''; }
            }
          }}
          className="w-full border-0 border-b border-transparent bg-transparent py-1 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border)] transition-colors"
          aria-label="Add task"
        />
      </div>
    </div>
  );

  const emptyState = topLevel.length === 0 && !onQuickCreate && (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Plus size={26} className="text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-muted)]">No tasks found</p>
      {onCreateTask && (
        <button onClick={() => onCreateTask()} className="ppm-btn-ghost">Create a task</button>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {/* Toolbar: group-by OR bulk action bar */}
      <div className="mb-2 flex items-center justify-between min-h-[36px]">
        {selected.size > 0 ? (
          <div className="flex items-center gap-2 text-sm animate-[ppmFade_140ms_ease-out]">
            <span className="text-[var(--text-secondary)]">{selected.size} selected</span>
            <span className="text-[var(--border-subtle)]">·</span>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) { runBulkStatus(e.target.value); e.target.value = ''; } }}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-secondary)] outline-none hover:bg-[var(--bg-surface-hover)]"
              aria-label="Change status for selected"
            >
              <option value="">Change status</option>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {onBulkAssign && (
              <button onClick={() => onBulkAssign([...selected])} className="ppm-btn-ghost text-xs">Assign</button>
            )}
            <button onClick={runBulkDelete} className="ppm-btn-ghost text-xs text-[var(--status-overdue)] hover:bg-[color-mix(in_srgb,var(--status-overdue)_10%,transparent)]">Delete</button>
            <button onClick={() => setSelected(new Set())} className="ppm-btn-ghost text-xs">Clear</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Group by</span>
            <select
              value={groupBy}
              onChange={(e) => setGroup(e.target.value)}
              className="rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-[var(--text-secondary)] outline-none hover:bg-[var(--bg-surface-hover)] focus:border-[var(--border)]"
              aria-label="Group tasks by"
            >
              {GROUP_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[920px]">
          {/* Header */}
          <div
            className="group sticky top-0 z-20 grid items-center gap-3 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]"
            style={{ gridTemplateColumns: columns }}
            role="row"
          >
            <span className={cn(someSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity')}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all tasks"
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--color-primary)]"
              />
            </span>
            <Header label="Task" />
            {!projectScoped && <Header label="Client / Project" />}
            <Header label="Assignees" />
            <Header label="Status" />
            <Header label="Priority" />
            <Header label="Due" />
            <Header label="Progress" />
            <span />
          </div>

          {emptyState}

          {groups.map((g) => {
            const isCollapsed = collapsed[g.key];
            return (
              <div key={g.key}>
                {groupBy !== 'none' && (
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(g.key)}
                    className="sticky top-[41px] z-10 flex w-full items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-page)] px-3 py-1.5 text-left hover:bg-[var(--bg-surface-hover)]"
                  >
                    {isCollapsed ? <ChevronRight size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{g.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">· {g.tasks.length}</span>
                  </button>
                )}
                {!isCollapsed && g.tasks.map(renderRow)}
              </div>
            );
          })}

          {quickAdd}
        </div>
      </div>
    </div>
  );
}
