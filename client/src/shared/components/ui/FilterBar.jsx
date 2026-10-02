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
  businessStatusFilter,
  onBusinessStatus,
  businessStatusOptions = [],
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
              aria-label="Filter by service status"
            >
              <option value="">All Task Status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {(businessStatusOptions.length > 0 || onBusinessStatus) && (
            <select
              value={businessStatusFilter || ''}
              onChange={(e) => onBusinessStatus?.(e.target.value)}
              className="h-9 rounded-lg border border-[var(--ppm-border)] bg-[var(--bg-surface)] px-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20"
              aria-label="Filter by business status"
            >
              <option value="">All Business Status</option>
              {businessStatusOptions.map((s) => (
                <option key={s.key || s} value={s.key || s}>
                  {s.label || s}
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
            <select
              value={activeCategory || ''}
              onChange={(e) => onCategory?.(e.target.value)}
              className="h-9 rounded-lg border border-[var(--ppm-border)] bg-[var(--bg-surface)] px-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20"
              aria-label="Filter by service type"
            >
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          )}

          {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
      )}
    </div>
  );
}
