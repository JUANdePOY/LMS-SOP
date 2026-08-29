import { cn } from '@/lib/utils';

// Status → desaturated dot color + neutral text label.
// Mirrors the status sets used across projects and tasks.
const STATUS_VAR = {
  // project lifecycle
  planning: 'var(--ppm-st-pending)',
  active: 'var(--ppm-st-in-progress)',
  on_hold: 'var(--ppm-st-cancelled)',
  completed: 'var(--ppm-st-completed)',
  cancelled: 'var(--ppm-st-cancelled)',
  // task statuses (normalized)
  pending: 'var(--ppm-st-pending)',
  in_progress: 'var(--ppm-st-in-progress)',
  review: 'var(--ppm-st-review)',
  overdue: 'var(--ppm-st-overdue)',
};

const STATUS_LABEL = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Not Started',
  in_progress: 'In Progress',
  review: 'In Review',
  overdue: 'Overdue',
};

function normalize(status) {
  if (!status) return '';
  return String(status).trim().toLowerCase().replace(/\s+/g, '_');
}

export default function StatusDot({ status, className, dotClassName }) {
  const key = normalize(status);
  const color = STATUS_VAR[key] || 'var(--ppm-st-pending)';
  const label = STATUS_LABEL[key] || status;
  return (
    <span className={cn('ppm-status', className)}>
      <span
        className={cn('ppm-dot', dotClassName)}
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
