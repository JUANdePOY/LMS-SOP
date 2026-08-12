import { memo } from 'react';
import { ASSIGNMENT_TYPE_LABELS } from '../constants/taskConstants';
import { User, Building2 } from 'lucide-react';

const TYPE_ICONS = {
  User: User,
  Department: Building2,
};

const AssignmentSection = memo(function AssignmentSection({ assignments }) {
  if (!assignments || assignments.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No assignments yet.</p>;
  }

  return (
    <div className="space-y-2">
      {assignments.map((a) => {
        const Icon = TYPE_ICONS[a.assignment_type] || User;
        return (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-md bg-[var(--bg-hover)] shrink-0">
                <Icon size={14} className="text-[var(--text-muted)]" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{ASSIGNMENT_TYPE_LABELS[a.assignment_type] || a.assignment_type}</span>
                <p className="text-sm text-[var(--text-primary)] truncate">{a.reference_name || a.reference_id}</p>
              </div>
            </div>
            <span className="text-xs text-[var(--text-muted)] shrink-0">{new Date(a.assigned_at).toLocaleDateString()}</span>
          </div>
        );
      })}
    </div>
  );
});

export default AssignmentSection;
