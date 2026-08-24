import { memo } from 'react';
import { Link } from 'react-router-dom';
import { PRIORITY_STYLES, STATUS_STYLES } from '../constants/taskConstants';
import { formatDate } from '../utils/taskDateUtils';
import { cn } from '@/lib/utils';
import { User, Calendar, Clock } from 'lucide-react';

function TaskCard({ task, onEdit, onDelete, onView, canManage }) {
  const assignments = task.assignments || [];
  const assigneeNames = assignments
    .filter((a) => a.assignment_type === 'User' && a.reference_name)
    .map((a) => a.reference_name);

  const progressRate = typeof task.progress_rate === 'number' ? task.progress_rate : null;

  const handleClick = (e) => {
    if (e.target.closest('button')) return;
    onView && onView(task);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm cursor-pointer",
        "hover:shadow-md transition-all hover:border-neutral-300 dark:hover:border-neutral-600"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/tasks/${task.id}`} onClick={onView}               className="font-medium text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline break-words leading-snug">
              {task.title}
            </Link>
          </div>
          {task.description && (
            <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">{task.description}</p>
          )}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium}`}>
              {task.priority}
            </span>
            <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status] || STATUS_STYLES.Pending}`}>
              {task.status}
            </span>
            {task.category && (
              <span className="text-xs text-[var(--text-muted)] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">{task.category}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center justify-center gap-1.5 font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400">
            #{task.id}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} className="text-neutral-400" />
            {formatDate(task.start_datetime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} className="text-neutral-400" />
            {formatDate(task.deadline_datetime)}
          </span>
          {task.estimated_hours && (
            <span className="inline-flex items-center gap-1.5">
              Est. {task.estimated_hours}h
            </span>
          )}
          {progressRate !== null && (
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <span className="block h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progressRate))}%` }} />
              </span>
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{progressRate}%</span>
            </span>
          )}
          {assigneeNames.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <User size={12} className="text-neutral-400" />
              {assigneeNames.slice(0, 2).join(', ')}
              {assigneeNames.length > 2 && <span className="text-neutral-400">+{assigneeNames.length - 2}</span>}
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex gap-1.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-xs font-medium">Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-xs font-medium">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TaskCard);
