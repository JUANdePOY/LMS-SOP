import { useState } from 'react';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from '../constants/taskConstants';
import { cn } from '@/lib/utils';
import { useClickOutside } from '../hooks/useClickOutside';

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-muted)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2.5 py-1.5 text-sm font-normal text-[var(--text-primary)] outline-none focus:border-blue-500"
      >
        {options}
      </select>
    </label>
  );
}

export default function TaskFilters({
  search,
  onSearch,
  statusFilter,
  onStatus,
  priorityFilter,
  onPriority,
  assigneeFilter,
  onAssignee,
  assigneeOptions,
  savedViews,
  activeViewKey,
  onApplyView,
  hasActiveFilters,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-8 pr-3 py-1.5 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]"
            aria-label="Search tasks"
          />
        </div>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              open || hasActiveFilters
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
            aria-label="Open filters"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-lg">
              <div className="grid grid-cols-1 gap-3">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={onStatus}
                  options={[
                    <option key="all" value="">All Status</option>,
                    ...TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>),
                  ]}
                />
                <Select
                  label="Priority"
                  value={priorityFilter}
                  onChange={onPriority}
                  options={[
                    <option key="all" value="">All Priority</option>,
                    ...TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>),
                  ]}
                />
                <Select
                  label="Assignee"
                  value={assigneeFilter}
                  onChange={onAssignee}
                  options={[
                    <option key="all" value="">Anyone</option>,
                    <option key="me" value="__me__">My Tasks</option>,
                    ...assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>),
                  ]}
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={onClear}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {savedViews.map((v) => {
          const active = activeViewKey === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onApplyView(v.key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {active && <Check size={11} />}
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
