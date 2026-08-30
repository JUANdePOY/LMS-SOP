import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Saved filter presets (e.g. All / Overdue / High Priority) rendered as chips.
 * These are *filter shortcuts*, not view types — keep them visually distinct
 * from `ViewTabs` so the two concepts never read as one control.
 */
export default function SavedViewChips({ views = [], activeKey, onApply, className }) {
  if (!views.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} role="group" aria-label="Saved views">
      {views.map((v) => {
        const active = activeKey === v.key;
        return (
          <button
            key={v.key}
            type="button"
            aria-pressed={active}
            onClick={() => onApply?.(v.key)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--ppm-border)] text-[var(--ppm-text-muted)] hover:bg-[var(--ppm-surface-hover)]'
            )}
          >
            {active && <Check size={11} />}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
