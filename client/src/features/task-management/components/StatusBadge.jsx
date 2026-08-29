import { cn } from '@/lib/utils';

// Maps both project lifecycle statuses (lowercase) and task statuses
// (Title Case: Pending / In Progress / Completed / Overdue / Cancelled) to the
// CSS status-pill classes defined in index.css.
const STATUS_CLASS = {
  // project lifecycle
  planning: 's-planning',
  active: 's-active',
  on_hold: 's-on_hold',
  completed: 's-completed',
  cancelled: 's-cancelled',
  // task statuses (normalized)
  pending: 's-pending',
  in_progress: 's-in_progress',
  overdue: 's-overdue',
};

const STATUS_LABEL = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Not Started',
  in_progress: 'In Progress',
  overdue: 'Overdue',
};

function normalize(status) {
  if (!status) return '';
  return String(status).trim().toLowerCase().replace(/\s+/g, '_');
}

export default function StatusBadge({ status, showDot = false, className }) {
  const key = normalize(status);
  const cls = STATUS_CLASS[key] || 's-pending';
  const label = STATUS_LABEL[key] || status;
  return (
    <span className={cn('status-pill', cls, className)}>
      {showDot && <span className="status-dot" />}
      {label}
    </span>
  );
}
