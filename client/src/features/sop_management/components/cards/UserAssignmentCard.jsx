import { Trash2, Building2, Briefcase, User } from 'lucide-react';
import { ASSIGNMENT_TYPE } from '../../constants/assignmentTypes';

const TYPE_ICONS = {
  [ASSIGNMENT_TYPE.DEPARTMENT]: Building2,
  [ASSIGNMENT_TYPE.POSITION]: Briefcase,
  [ASSIGNMENT_TYPE.USER]: User,
};

const TYPE_COLORS = {
  [ASSIGNMENT_TYPE.DEPARTMENT]: 'text-blue-600 bg-blue-50',
  [ASSIGNMENT_TYPE.POSITION]: 'text-purple-600 bg-purple-50',
  [ASSIGNMENT_TYPE.USER]: 'text-emerald-600 bg-emerald-50',
};

export default function UserAssignmentCard({ assignment, onDelete, disabled }) {
  const Icon = TYPE_ICONS[assignment.assignment_type] || User;
  const colorClass = TYPE_COLORS[assignment.assignment_type] || 'text-gray-600 bg-gray-50';

  let targetLabel = '';
  if (assignment.assignment_type === ASSIGNMENT_TYPE.DEPARTMENT) {
    targetLabel = assignment.department_name || `Department #${assignment.department_id}`;
  } else if (assignment.assignment_type === ASSIGNMENT_TYPE.POSITION) {
    targetLabel = assignment.position_title;
  } else {
    targetLabel = assignment.user_name || `User #${assignment.user_id}`;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{targetLabel}</p>
          <p className="text-xs text-gray-500 capitalize">
            {assignment.assignment_type} assignment
          </p>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(assignment.id)}
          disabled={disabled}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          title="Remove assignment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

