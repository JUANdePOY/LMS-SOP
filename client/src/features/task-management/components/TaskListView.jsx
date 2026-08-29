import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionHeader from '@/shared/components/ui/SectionHeader';
import PriorityPill from '@/shared/components/ui/PriorityPill';
import Avatar from '@/shared/components/ui/Avatar';

function isOverdue(task) {
  if (!task.deadline_datetime) return false;
  if (task.status === 'Completed' || task.status === 'Cancelled') return false;
  return new Date(task.deadline_datetime) < new Date();
}

function formatDue(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function progressOf(task) {
  const v = task.progress_rate ?? task.completion_rate ?? 0;
  return typeof v === 'number' ? v : 0;
}

function TaskListItem({ task, onStatusChange, onProgressChange, onViewTask }) {
  const overdue = isOverdue(task);
  const pct = Math.min(100, Math.max(0, progressOf(task)));
  const userAssignees = (task.assignments || [])
    .filter((a) => a.assignment_type === 'User')
    .map((a) => ({ name: a.reference_name, avatar_url: a.avatar_url }));
  const primary = userAssignees[0];

  const toggleComplete = () => {
    onStatusChange?.(task, task.status === 'Completed' ? 'In Progress' : 'Completed');
  };

  const bumpProgress = () => {
    const next = pct >= 100 ? 0 : Math.min(100, pct + 10);
    onProgressChange?.(task.id, next);
  };

  return (
    <div
      role="row"
      className="group grid grid-cols-[32px_minmax(0,1fr)_110px_120px_90px_120px] items-center gap-3 border-b border-[var(--ppm-border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--ppm-surface-hover)]"
    >
      <span className="flex items-center">
        <button
          type="button"
          onClick={toggleComplete}
          aria-label={task.status === 'Completed' ? 'Mark incomplete' : 'Mark complete'}
          className={cn(
            'grid h-4 w-4 place-items-center rounded border-2 transition-colors',
            task.status === 'Completed'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-[var(--ppm-border-strong)] hover:border-emerald-500'
          )}
        >
          {task.status === 'Completed' && <Check size={10} strokeWidth={3} />}
        </button>
      </span>

      <button
        type="button"
        onClick={() => onViewTask?.(task)}
        className="min-w-0 truncate text-left font-medium text-[var(--ppm-text)] hover:underline"
        title={task.title}
      >
        {task.title}
      </button>

      <span className="min-w-0">
        <PriorityPill priority={task.priority} />
      </span>

      <span className="flex min-w-0 items-center gap-2">
        {primary ? (
          <Avatar name={primary.name} avatarUrl={primary.avatar_url} size="28" />
        ) : (
          <span className="text-xs text-[var(--ppm-text-muted)]">Unassigned</span>
        )}
      </span>

      <span
        className={cn(
          'truncate text-xs',
          overdue ? 'text-[var(--ppm-status-overdue)]' : 'text-[var(--ppm-text-muted)]'
        )}
      >
        {formatDue(task.deadline_datetime) || '—'}
      </span>

      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={bumpProgress}
          className="flex flex-1 items-center gap-2 text-left"
          title="Click to update progress"
          aria-label="Update progress"
        >
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ppm-border)]">
            <span
              className="block h-full rounded-full bg-[var(--color-primary)]"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="w-9 text-right text-[11px] tabular-nums text-[var(--ppm-text-muted)]">
            {pct}%
          </span>
        </button>
      </span>
    </div>
  );
}

/**
 * Presentational task list grouped into collapsible sections. The parent owns
 * the grouping logic (due-date buckets or project groups) and passes the
 * result as `sections` — this component only renders. Used by the employee
 * My Tasks page today; structured to be reused by the admin list later.
 */
export default function TaskListView({
  sections = [],
  onStatusChange,
  onProgressChange,
  onViewTask,
  loading = false,
}) {
  if (loading && sections.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--ppm-surface-hover)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {sections.map((sec) => (
        <div key={sec.key}>
          <SectionHeader
            title={sec.label}
            count={sec.count ?? sec.items.length}
            actions={sec.actions}
          />
          <div className="ppm-card overflow-hidden">
            {sec.items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[var(--ppm-text-muted)]">No tasks.</p>
            ) : (
              sec.items.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onProgressChange={onProgressChange}
                  onViewTask={onViewTask}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
