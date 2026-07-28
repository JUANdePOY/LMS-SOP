import { Trash2, Building2, Briefcase, User } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ASSIGNMENT_TYPE } from '../../constants/assignmentTypes';

const TYPE_ICONS = {
  [ASSIGNMENT_TYPE.DEPARTMENT]: <Building2 className="h-4 w-4" />,
  [ASSIGNMENT_TYPE.POSITION]: <Briefcase className="h-4 w-4" />,
  [ASSIGNMENT_TYPE.USER]: <User className="h-4 w-4" />,
};

const TYPE_BADGES = {
  [ASSIGNMENT_TYPE.DEPARTMENT]: 'bg-blue-50 text-blue-700 border-blue-200',
  [ASSIGNMENT_TYPE.POSITION]: 'bg-purple-50 text-purple-700 border-purple-200',
  [ASSIGNMENT_TYPE.USER]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AssignmentTable({ assignments, onDelete, loading, disabled }) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading assignments…</div>;
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
        No assignments yet. Add one to assign this SOP.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">Assigned By</th>
            <th className="px-4 py-3">Date</th>
            <th className="w-16 px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assignments.map((assignment) => (
            <tr key={assignment.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    TYPE_BADGES[assignment.assignment_type] || 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {TYPE_ICONS[assignment.assignment_type] || null}
                  {assignment.assignment_type}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {assignment.assignment_type === ASSIGNMENT_TYPE.DEPARTMENT
                  ? assignment.department_name || `Department #${assignment.department_id}`
                  : assignment.assignment_type === ASSIGNMENT_TYPE.POSITION
                  ? assignment.position_title
                  : assignment.user_name || (assignment.user_id != null ? `User #${assignment.user_id}` : '—')}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {assignment.assigned_by_name || (assignment.assigned_by != null ? `User #${assignment.assigned_by}` : '—')}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {assignment.created_at
                  ? new Date(assignment.created_at).toLocaleDateString()
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                {onDelete && (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(assignment.id)} disabled={disabled} title="Remove assignment">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

