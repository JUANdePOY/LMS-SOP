import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Collapsible section header used by list views (My Tasks sections, admin
 * project sections). Presentational only — collapsing state is owned by the
 * parent so it can be persisted (e.g. localStorage) or derived.
 *
 * - `title`   : section label
 * - `count`   : optional task count rendered as "· N"
 * - `actions` : right-aligned node (e.g. an inline "+ Add task" button)
 * - `indent`  : tree depth for Client → Business → Project nesting
 */
export default function SectionHeader({
  title,
  count,
  collapsed = false,
  onToggle,
  actions,
  indent = 0,
  className,
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 border-b border-[var(--ppm-border)] bg-[var(--ppm-surface)] px-3 py-2',
        className
      )}
      style={{ paddingLeft: `${12 + indent * 16}px` }}
    >
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          className="rounded p-0.5 text-[var(--ppm-text-muted)] hover:bg-[var(--ppm-surface-hover)]"
        >
          <ChevronRight
            size={14}
            className={cn('transition-transform', !collapsed && 'rotate-90')}
          />
        </button>
      ) : (
        <span className="w-5" aria-hidden="true" />
      )}

      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ppm-text-2)]">
        {title}
      </span>

      {typeof count === 'number' && (
        <span className="text-xs text-[var(--ppm-text-muted)]">· {count}</span>
      )}

      {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
    </div>
  );
}
