import { useState, useRef, useEffect, memo } from 'react';
import { MoreVertical, Pencil, Trash2, ArrowUpRight, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '../hooks/useClickOutside';
import { TASK_PRIORITY_DOT, TASK_TABLE_GRID_COLS } from '../constants/taskConstants';
import { StatusMenu, PriorityDot, InlineEditableText, EditableDateTime } from './TaskInlineControls';
import { formatDateTime } from '../utils/taskDateUtils';
import AssignmentInput from './AssignmentInput';
import DescriptionModal from './DescriptionModal';
import UserAvatar from '@/shared/components/ui/Avatar';


function AssigneeStack({ items }) {
  if (!items || items.length === 0) {
    return <span className="text-sm text-[var(--text-muted)]">—</span>;
  }

  const users = items.filter((i) => i.type === 'User');
  const departments = items.filter((i) => i.type !== 'User');

  const shownUsers = users.slice(0, 3);
  const shownDepartments = departments.slice(0, 2);
  const remaining = items.length - shownUsers.length - shownDepartments.length;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex -space-x-2 shrink-0">
        {shownUsers.map((item, i) => (
          <UserAvatar
            key={`user-${i}`}
            user={{ full_name: item.name, avatar_url: item.avatar_url }}
            size="xs"
            className="h-6 w-6 border-2 border-[var(--bg-surface)]"
          />
        ))}
      </div>
      {shownDepartments.map((dept, i) => (
        <span
          key={`dept-${i}`}
          title={dept.name}
          className="shrink-0 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
        >
          {dept.name}
        </span>
      ))}
      <span className="text-sm text-[var(--text-primary)] truncate">
        {users.length > 0 ? users[0].name : departments[0]?.name}
        {remaining > 0 && <span className="text-[var(--text-muted)]"> +{remaining}</span>}
      </span>
    </div>
  );
}

function ProgressBar({ rate, taskId, onProgressChange }) {
  const [editing, setEditing] = useState(false);
  const [localRate, setLocalRate] = useState(typeof rate === 'number' ? rate : 0);

  const displayRate = typeof rate === 'number' ? rate : 0;
  const pct = Math.min(100, Math.max(0, editing ? localRate : displayRate));

  const barColor = pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500';

  // Read-only mode: no onProgressChange — just show the bar
  if (!onProgressChange) {
    if (typeof rate !== 'number') {
      return <span className="text-sm text-[var(--text-muted)]">—</span>;
    }
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-2 flex-1 min-w-[40px] overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <span className={cn('block h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
        </span>
        <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums w-10 text-right">{pct}%</span>
      </div>
    );
  }

  // Edit mode: show slider
  if (editing) {
    return (
      <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="range"
          min="0"
          max="100"
          value={pct}
          onChange={(e) => {
            const val = Number(e.target.value);
            setLocalRate(val);
            onProgressChange(taskId, val);
          }}
          onBlur={() => setEditing(false)}
          autoFocus
          className="flex-1 min-w-[40px] cursor-pointer"
        />
        <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums w-10 text-right">{pct}%</span>
      </div>
    );
  }

  // Display mode: the entire bar + percentage is clickable
  return (
    <div
      className="flex items-center gap-2 min-w-0 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Click to edit progress"
    >
      <span className="h-3 flex-1 min-w-[40px] overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <span className={cn('block h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}

const RowActionMenu = memo(function RowActionMenu({ onEdit, onDelete, canManage }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, right: null });
  const ref = useClickOutside(() => setOpen(false));
  const buttonRef = useRef(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 176;
      const gap = 4;
      let left = rect.right + gap;
      let right = null;

      if (left + menuWidth > window.innerWidth) {
        right = window.innerWidth - rect.left + gap;
        left = null;
      }

      setPosition({ top: rect.bottom + gap, left, right });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open]);

  if (!canManage) return null;

  const menuStyle = {
    position: 'fixed',
    top: position.top,
    ...(position.left !== null ? { left: position.left } : {}),
    ...(position.right !== null ? { right: position.right } : {}),
  };

  return (
    <div className="relative shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-lg hover:bg-[var(--bg-page)] text-[var(--text-muted)]"
        aria-label="Actions"
        title="Actions"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div
          ref={ref}
          onClick={(e) => e.stopPropagation()}
          style={menuStyle}
          className="z-50 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1 shadow-xl"
        >
          <button
            type="button"
            onClick={() => { onEdit?.(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
          >
            <Pencil size={14} />
            Edit
          </button>
          <div className="my-1 border-t border-[var(--border)]" />
          <button
            type="button"
            onClick={() => { onDelete?.(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
});

function AssigneePopover({ assignments, onSave, onClose }) {
  const [draft, setDraft] = useState(
    assignments.map((a) => ({ assignment_type: a.assignment_type, reference_id: a.reference_id, reference_name: a.reference_name }))
  );
  const ref = useClickOutside(onClose);

  const update = (idx, updated) => {
    setDraft((prev) => prev.map((a, i) => (i === idx ? { ...a, ...updated } : a)));
  };
  const remove = (idx) => setDraft((prev) => prev.filter((_, i) => i !== idx));
  const add = () => setDraft((prev) => [...prev, { assignment_type: 'User', reference_id: '', reference_name: '' }]);

  const handleDone = () => {
    onSave(draft.filter((a) => a.reference_id || a.reference_name));
    onClose();
  };

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 left-0 top-full mt-1 w-80 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-xl"
    >
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {draft.length === 0 && <p className="text-xs text-[var(--text-muted)]">No assignments yet.</p>}
        {draft.map((a, idx) => (
          <AssignmentInput key={idx} assignment={a} onUpdate={(u) => update(idx, u)} onRemove={() => remove(idx)} canRemove />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={add} className="text-xs font-medium text-blue-600 hover:text-blue-700">
          + Add assignment
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-1 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800"
        >
          Done
        </button>
      </div>
    </div>
  );
}

const AssignedCell = memo(function AssignedCell({ assignments, onSave }) {
  const [open, setOpen] = useState(false);

  const items = assignments
    .filter((a) => (a.assignment_type === 'User' || a.assignment_type === 'Department') && a.reference_name)
    .map((a) => ({ name: a.reference_name, type: a.assignment_type, avatar_url: a.avatar_url }));

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="w-full min-w-0 rounded-md px-1.5 py-0.5 -mx-1.5 text-left hover:bg-[var(--bg-page)]"
        title="Click to edit assignments"
      >
        <AssigneeStack items={items} />
      </button>
      {open && (
        <AssigneePopover
          assignments={assignments}
          onSave={(next) => onSave({ assignments: next })}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
});

const TaskRow = memo(function TaskRow({ task, onEdit, onDelete, onStatusChange, onInlineUpdate, onViewTask, onProgressChange, canManage, depth = 0, onAddSubtask, collapsed = false, onToggleCollapse }) {
  const assignments = task.assignments || [];
  const saveField = (changes) => {
    if (!canManage) return;
    onInlineUpdate?.(task, changes);
  };

  const [descriptionOpen, setDescriptionOpen] = useState(false);

  return (
    <div
      className="group grid items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors"
      style={{ gridTemplateColumns: TASK_TABLE_GRID_COLS, paddingLeft: 16 }}
    >
      {depth > 0 ? (
        <span aria-hidden="true" />
      ) : (
        <span onClick={(e) => e.stopPropagation()}>
          <StatusMenu status={task.status} onStatusChange={(newStatus) => onStatusChange?.(task, newStatus)} />
        </span>
      )}

        <div className="min-w-0 flex items-center gap-1.5">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
              className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
              aria-label={collapsed ? 'Expand sub-tasks' : 'Collapse sub-tasks'}
              title={collapsed ? 'Expand sub-tasks' : 'Collapse sub-tasks'}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {onAddSubtask && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddSubtask(task); }}
              className="shrink-0 text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 transition-opacity"
              aria-label="Add sub-task"
              title="Add sub-task"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onViewTask?.(task); }}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 transition-opacity"
            aria-label="Open task details"
            title="Open details"
          >
            <ArrowUpRight size={14} />
          </button>
          {canManage ? (
           <PriorityDot priority={task.priority} onSave={saveField} />
         ) : (
           <span className={cn('h-2 w-2 rounded-full shrink-0', TASK_PRIORITY_DOT[task.priority] || TASK_PRIORITY_DOT.Medium)} title={`${task.priority} priority`} />
         )}
         {canManage ? (
           <InlineEditableText
             value={task.title}
             onSave={(title) => saveField({ title })}
             className="min-w-0 truncate rounded-md px-1.5 py-0.5 -mx-1.5 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-page)]"
           />
         ) : (
           <span className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">{task.title}</span>
         )}
         {task.category && (
           <span className="hidden md:inline shrink-0 text-xs text-[var(--text-muted)] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
             {task.category}
           </span>
         )}
       </div>

       <div className="min-w-0">
         {canManage ? (
           <AssignedCell assignments={assignments} onSave={saveField} />
         ) : (
            <AssigneeStack
              items={assignments
                .filter((a) => (a.assignment_type === 'User' || a.assignment_type === 'Department') && a.reference_name)
                .map((a) => ({ name: a.reference_name, type: a.assignment_type, avatar_url: a.avatar_url }))}
            />
         )}
       </div>

        <div className="min-w-0">
          <ProgressBar
            rate={task.progress_rate}
            taskId={task.id}
            onProgressChange={
              task.status === 'Completed' || task.status === 'Cancelled' ? undefined : onProgressChange
            }
          />
          {task.is_parent && (
            <span className="text-[10px] text-[var(--text-muted)]">auto</span>
          )}
        </div>

       <div className="min-w-0">
         {canManage ? (
           <EditableDateTime value={task.start_datetime} field="start_datetime" onSave={saveField} />
         ) : (
           <span className="text-sm text-[var(--text-secondary)] truncate">{formatDateTime(task.start_datetime)}</span>
         )}
       </div>

       <div className="min-w-0">
         {canManage ? (
           <EditableDateTime value={task.deadline_datetime} field="deadline_datetime" onSave={saveField} />
         ) : (
           <span className="text-sm text-[var(--text-secondary)] truncate">{formatDateTime(task.deadline_datetime)}</span>
         )}
       </div>

        <div className="min-w-0 overflow-hidden">
          {canManage ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDescriptionOpen(true); }}
              className="min-w-0 w-full truncate rounded-md px-1.5 py-0.5 -mx-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
              title="Click to edit description"
            >
              {task.description || <span className="text-[var(--text-muted)]">Click to add description</span>}
            </button>
          ) : (
            <span className="min-w-0 w-full block truncate text-sm text-[var(--text-secondary)]">{task.description || '—'}</span>
          )}
        </div>

       <DescriptionModal
         open={descriptionOpen}
         onClose={() => setDescriptionOpen(false)}
         onSubmit={(description) => saveField({ description })}
         initialDescription={task.description}
       />

       <RowActionMenu
         onEdit={() => onEdit?.(task)}
         onDelete={() => onDelete?.(task.id)}
         canManage={canManage}
       />
     </div>
  );
});

export { AssigneeStack, ProgressBar, RowActionMenu, AssignedCell, AssigneePopover, TaskRow };
