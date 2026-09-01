import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Check, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import UserAvatar from '@/shared/components/ui/Avatar';
import { formatDateTime } from '../utils/taskDateUtils';
import { AssigneePicker } from './TaskListRow';

function isCompleted(node) {
  return node.auto_status === 'Completed' || node.status === 'Completed';
}

function AddSubtaskRow({ parentId, depth, onAdd, autoFocus }) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const value = title.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(parentId, value);
      setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 border-t border-[var(--border)] py-2"
      style={{ paddingLeft: depth * 16 + 8 }}
    >
      <span className="flex h-5 w-5 items-center justify-center text-[var(--text-muted)]">
        <Plus size={15} />
      </span>
      <input
        autoFocus={autoFocus}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
          if (e.key === 'Escape') setTitle('');
        }}
        placeholder="Add sub-task"
        className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-colors hover:border-[var(--border)] focus:border-[var(--color-primary)]"
      />
      {submitting && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-blue-500" />
      )}
    </div>
  );
}

function SubtaskRow({ node, depth, canManage, onToggle, onDelete, onOpenTask, onAdd, onAssign }) {
  const done = isCompleted(node);
  const userAssignees = (node.assignments || []).filter((a) => a.assignment_type === 'User');
  const children = node.subtasks || [];

  const handleAssign = (userList) => {
    const teams = (node.assignments || []).filter((a) => a.assignment_type !== 'User');
    onAssign?.(node.id, [...teams, ...userList]);
  };

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2"
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        <button
          type="button"
          onClick={() => onToggle(node.id, done ? 'Pending' : 'Completed')}
          aria-label={done ? 'Mark as not completed' : 'Mark as completed'}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
            done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-[var(--border)] text-transparent hover:border-[var(--color-primary)]'
          )}
        >
          <Check size={13} strokeWidth={3} />
        </button>

        <button
          type="button"
          onClick={() => onOpenTask?.(node.id)}
          className={cn(
            'min-w-0 flex-1 truncate text-left text-sm',
            done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'
          )}
        >
          {node.title}
        </button>

        {canManage && (
          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
            <AssigneePicker assignments={node.assignments} onSave={handleAssign} />
          </span>
        )}

        <StatusBadge status={node.auto_status} className="shrink-0" />

        {node.deadline_datetime && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--text-muted)]">
            <CalendarDays size={13} />
            {formatDateTime(node.deadline_datetime)}
          </span>
        )}

        {userAssignees.length > 0 && (
          <span className="flex shrink-0 items-center -space-x-1">
            {userAssignees.slice(0, 3).map((a, i) => (
              <UserAvatar
                key={`${a.reference_id}-${i}`}
                user={{ full_name: a.reference_name, avatar_url: a.avatar_url }}
                size="xs"
                className="ring-2 ring-[var(--bg-surface)]"
              />
            ))}
          </span>
        )}

        {canManage && (
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            aria-label="Delete sub-task"
            className="shrink-0 rounded-md p-1 text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {children.length > 0 && (
        <div>
          {children.map((child) => (
            <SubtaskRow
              key={child.id}
              node={child}
              depth={depth + 1}
              canManage={canManage}
              onToggle={onToggle}
              onDelete={onDelete}
              onOpenTask={onOpenTask}
              onAdd={onAdd}
              onAssign={onAssign}
            />
          ))}
        </div>
      )}

      {canManage && (
        <AddSubtaskRow parentId={node.id} depth={depth + 1} onAdd={onAdd} />
      )}
    </div>
  );
}

export default function SubtaskList({ subtasks = [], canManage, onToggle, onDelete, onAdd, onOpenTask, onAssign, scrollIntoView = false }) {
  const flat = subtasks || [];
  const doneCount = flat.filter(isCompleted).length;
  const sectionRef = useRef(null);

  // When the parent (task detail drawer) wants the user's attention drawn to
  // the sub-tasks area — e.g. the user clicked the "N" subtask-count pill on
  // a task row — scroll the section into view inside the nearest scrollable
  // ancestor and pulse-highlight it so the user lands exactly where they
  // expect. Honors reduced-motion by skipping the highlight transition.
  useEffect(() => {
    if (!scrollIntoView || !sectionRef.current) return;
    const el = sectionRef.current;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Find the drawer's scroll container so we scroll within it (not the page).
    const scrollParent = el.closest('.overflow-y-auto') || el.parentElement;
    if (scrollParent && typeof scrollParent.scrollTo === 'function') {
      const elTop = el.getBoundingClientRect().top;
      const parentTop = scrollParent.getBoundingClientRect().top;
      scrollParent.scrollTo({ top: scrollParent.scrollTop + (elTop - parentTop) - 16, behavior: reduce ? 'auto' : 'smooth' });
    } else {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    if (!reduce) {
      el.classList.add('ring-2', 'ring-[var(--color-primary)]', 'ring-offset-2', 'ring-offset-[var(--bg-surface)]', 'rounded-lg', 'transition');
      const t = setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[var(--color-primary)]', 'ring-offset-2', 'ring-offset-[var(--bg-surface)]');
      }, 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [scrollIntoView, flat.length]);

  return (
    <div ref={sectionRef} className="border-t border-[var(--border)] px-2 pt-4">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
          Sub-tasks
          {flat.length > 0 && (
            <span className="text-xs font-normal text-[var(--text-muted)]">
              {doneCount}/{flat.length}
            </span>
          )}
        </h4>
        {flat.length > 0 && (
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${flat.length ? Math.round((doneCount / flat.length) * 100) : 0}%` }}
            />
          </div>
        )}
      </div>

      {flat.length === 0 ? (
        <p className="py-1 text-xs text-[var(--text-muted)]">No sub-tasks yet.</p>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
          {flat.map((node) => (
            <SubtaskRow
              key={node.id}
              node={node}
              depth={0}
              canManage={canManage}
              onToggle={onToggle}
              onDelete={onDelete}
              onOpenTask={onOpenTask}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}

      {canManage && <AddSubtaskRow parentId={null} depth={0} onAdd={onAdd} autoFocus />}
    </div>
  );
}
