import { memo } from 'react';
import { ASSIGNMENT_TYPE_LABELS } from '../constants/taskConstants';
import { User, Building2, Users, CalendarDays } from 'lucide-react';

const TYPE_ICONS = {
  User: User,
  Department: Building2,
};

const TYPE_STYLES = {
  User: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  Department: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
};

const DEFAULT_STYLE = 'bg-[var(--bg-hover)] text-[var(--text-muted)]';

const AssignmentSection = memo(function AssignmentSection({ assignments }) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-hover)]">
          <Users size={18} className="text-[var(--text-muted)] opacity-70" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">No assignments yet.</p>
        <p className="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">Assign a person or department to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {assignments.map((a) => {
        const Icon = TYPE_ICONS[a.assignment_type] || User;
        const iconStyle = TYPE_STYLES[a.assignment_type] || DEFAULT_STYLE;
        return (
          <div
            key={a.id}
            className="group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 transition-colors hover:border-[var(--text-muted)]/30 hover:bg-[var(--bg-hover)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconStyle}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  {ASSIGNMENT_TYPE_LABELS[a.assignment_type] || a.assignment_type}
                </span>
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{a.reference_name || a.reference_id}</p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--text-muted)]">
              <CalendarDays size={12} className="opacity-60" />
              {new Date(a.assigned_at).toLocaleDateString()}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export default AssignmentSection;