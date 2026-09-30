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
  categories,
  onCategory,
  activeCategory,
  children,
  className,
  hideSearch = false,
}) {
  const showSearch = !hideSearch;
  const showFilters = statusOptions.length > 0 || onStatus || priorityOptions.length > 0 || onPriority || assigneeOptions.length > 0 || onAssignee || (Array.isArray(categories) && categories.length > 0) || children;

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--ppm-border)] bg-[var(--ppm-surface)] p-2 shadow-sm',
        className
      )}
    >
      {showSearch && (
        <div className="relative mb-2">
          <Search
            size={16}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ppm-text-muted)]"
          />
          <input
            type="text"
            value={search || ''}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Search tasks..."
            className="h-9 w-full rounded-lg border border-[var(--ppm-border)] bg-[var(--bg-surface)] pl-8 pr-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 placeholder:text-[var(--ppm-text-muted)]"
            aria-label="Search tasks"
          />
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {(statusOptions.length > 0 || onStatus) && (
            <select
              value={statusFilter || ''}
              onChange={(e) => onStatus?.(e.target.value)}
              className="h-9 rounded-lg border border-[var(--ppm-border)] bg-[var(--bg-surface)] px-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20"
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
              className="h-9 rounded-lg border border-[var(--ppm-border)] bg-[var(--bg-surface)] px-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20"
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
              className="h-9 rounded-lg border border-[var(--ppm-border)] bg-[var(--bg-surface)] px-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20"
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

          {Array.isArray(categories) && categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onCategory?.(cat.key)}
                  className={cn(
                    'h-9 rounded-lg border px-3 text-sm font-medium transition-all duration-150 ease-out motion-reduce:transition-none',
                    activeCategory === cat.key
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm'
                      : 'border-[var(--ppm-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--bg-surface-hover)]'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
      )}
    </div>
  );
}
