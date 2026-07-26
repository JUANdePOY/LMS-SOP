import { Trash2, Building2, Briefcase, User } from 'lucide-react';
import { ASSIGNMENT_TYPE } from '../../constants/assignmentTypes';

const TYPE_ICONS = {
  [ASSIGNMENT_TYPE.DEPARTMENT]: Building2,
  [ASSIGNMENT_TYPE.POSITION]: Briefcase,
  [ASSIGNMENT_TYPE.USER]: User,
};

const TYPE_COLORS = {
  [ASSIGNMENT_TYPE.DEPARTMENT]: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
  [ASSIGNMENT_TYPE.POSITION]: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30',
  [ASSIGNMENT_TYPE.USER]: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30',
};

export default function UserAssignmentCard({ assignment, onDelete, disabled }) {
  const Icon = TYPE_ICONS[assignment.assignment_type] || User;
  const colorClass = TYPE_COLORS[assignment.assignment_type] || 'text-[var(--text-secondary)] bg-[var(--bg-hover)]';

  let targetLabel = '';
  if (assignment.assignment_type === ASSIGNMENT_TYPE.DEPARTMENT) {
    targetLabel = assignment.department_name || `Department #${assignment.department_id}`;
  } else if (assignment.assignment_type === ASSIGNMENT_TYPE.POSITION) {
    targetLabel = assignment.position_title;
  } else {
    targetLabel = assignment.user_name || `User #${assignment.user_id}`;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{targetLabel}</p>
          <p className="text-xs text-[var(--text-secondary)] capitalize">
            {assignment.assignment_type} assignment
          </p>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(assignment.id)}
          disabled={disabled}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 disabled:opacity-50"
          title="Remove assignment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}