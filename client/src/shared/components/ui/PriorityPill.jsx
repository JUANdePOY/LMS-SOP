import { cn } from '@/lib/utils';

// Pill background uses the light --ppm-priority-*-bg token; text and the
// optional dot use the darker --ppm-priority-* token so the label stays
// readable. These tokens are defined in client/src/index.css (Asana-style block).
const PRIORITY = {
  Low: { bg: 'var(--ppm-priority-low-bg)', fg: 'var(--ppm-priority-low)' },
  Medium: { bg: 'var(--ppm-priority-medium-bg)', fg: 'var(--ppm-priority-medium)' },
  High: { bg: 'var(--ppm-priority-high-bg)', fg: 'var(--ppm-priority-high)' },
  Critical: { bg: 'var(--ppm-priority-critical-bg)', fg: 'var(--ppm-priority-critical)' },
};

export default function PriorityPill({ priority, showDot = false, className }) {
  if (!priority) return null;
  const tone = PRIORITY[priority] || PRIORITY.Medium;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium',
        className
      )}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: tone.fg }}
          aria-hidden="true"
        />
      )}
      {priority}
    </span>
  );
}
