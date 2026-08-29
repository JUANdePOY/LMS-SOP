import { cn } from '@/lib/utils';

const PRIORITY_CLASS = {
  Low: 'p-low',
  Medium: 'p-medium',
  High: 'p-high',
  Critical: 'p-critical',
};

const PRIORITY_LABEL = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
};

export default function PriorityFlag({ priority, withLabel = false, className }) {
  if (!priority) return null;
  const cls = PRIORITY_CLASS[priority] || 'p-medium';
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={`Priority: ${priority}`}>
      <span className={cn('priority-dot', cls)} />
      {withLabel && <span className="text-xs font-medium text-[var(--text-muted)]">{PRIORITY_LABEL[priority] || priority}</span>}
    </span>
  );
}
