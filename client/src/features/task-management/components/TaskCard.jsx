import { memo } from 'react';
import { PRIORITY_STYLES, STATUS_STYLES, TASK_STATUS_LABELS } from '../constants/taskConstants';
import { formatDate } from '../utils/taskDateUtils';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import Avatar from '@/shared/components/ui/Avatar';

function isOverdue(task) {
  if (!task.deadline_datetime) return false;
  if (task.status === 'Completed' || task.status === 'Cancelled') return false;
  return new Date(task.deadline_datetime) < new Date();
}

/**
 * Asana-style board card: title + minimal status line (priority/status pills,
 * due-date chip, assignee avatars). Clicking opens the detail panel rather than
 * navigating away. Edit/Delete stay as explicit affordances for admins.
 */
function TaskCard({ task, onEdit, onDelete, onView, canManage }) {
  const userAssignees = (task.assignments || [])
    .filter((a) => a.assignment_type === 'User')
    .map((a) => ({ name: a.reference_name, avatarUrl: a.avatar_url }));
  const overdue = isOverdue(task);

  return (
    <div
      onClick={() => onView?.(task)}
      className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md dark:hover:border-neutral-600"
    >
      <p className="text-sm font-medium leading-snug text-[var(--text-primary)] break-words">{task.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium)}>
          {task.priority}
        </span>
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[task.status] || STATUS_STYLES.Pending)}>
          {TASK_STATUS_LABELS[task.status] || task.status}
        </span>
        {task.deadline_datetime && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              overdue
                ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
            )}
          >
            <Calendar size={11} />
            {formatDate(task.deadline_datetime)}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center -space-x-1.5">
          {userAssignees.slice(0, 3).map((a, i) => (
            <Avatar key={i} name={a.name} avatarUrl={a.avatar_url} size="20" className="ring-2 ring-[var(--bg-surface)]" />
          ))}
          {userAssignees.length === 0 && <span className="text-[11px] text-[var(--text-muted)]">Unassigned</span>}
        </div>
        {canManage && (
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
              className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium hover:bg-[var(--bg-hover)]"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(task.id); }}
              className="rounded-lg border border-red-200 px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TaskCard);
