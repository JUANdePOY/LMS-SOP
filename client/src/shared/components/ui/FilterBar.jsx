import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared task filter bar used by both the employee My Tasks page and the admin
 * Tasks page. Renders a search box + any provided filter dropdowns, and a
 * right-aligned `children` slot for view/sort controls (so saved-view chips and
 * sort toggles sit beside the filters, never mixed into them).
 */
export default function FilterBar({
  search,
  onSearch,
  statusFilter,
  onStatus,
  statusOptions = [],
  priorityFilter,
  onPriority,
  priorityOptions = [],
  assigneeFilter,
  onAssignee,
  assigneeOptions = [],
  children,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ppm-text-muted)]"
          />
          <input
            type="text"
            value={search || ''}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-[var(--ppm-border)] bg-[var(--ppm-surface)] pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--ppm-text-muted)] sm:w-64"
            aria-label="Search tasks"
          />
        </div>

        {(statusOptions.length > 0 || onStatus) && (
          <select
            value={statusFilter || ''}
            onChange={(e) => onStatus?.(e.target.value)}
            className="rounded-lg border border-[var(--ppm-border)] bg-[var(--ppm-surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        {(priorityOptions.length > 0 || onPriority) && (
          <select
            value={priorityFilter || ''}
            onChange={(e) => onPriority?.(e.target.value)}
            className="rounded-lg border border-[var(--ppm-border)] bg-[var(--ppm-surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
            aria-label="Filter by priority"
          >
            <option value="">All Priority</option>
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {(assigneeOptions.length > 0 || onAssignee) && (
          <select
            value={assigneeFilter || ''}
            onChange={(e) => onAssignee?.(e.target.value)}
            className="rounded-lg border border-[var(--ppm-border)] bg-[var(--ppm-surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
            aria-label="Filter by assignee"
          >
            <option value="">All Assignees</option>
            {assigneeOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
      </div>

      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
