import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { fetchAssigned, deleteAssignment } from '@/features/sop-management/services/assignmentService';

export default function AssignmentList({ sopId }) {
  const [assignments, setAssignments] = useState([]);

  const load = useCallback(async () => {
    try {
      const r = await fetchAssigned(sopId);
      setAssignments(r.data?.data || []);
    } catch { setAssignments([]); }
  }, [sopId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await deleteAssignment(id);
      await load();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-2">
      {assignments.map((a) => (
        <div key={a.assignment_id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 bg-white dark:bg-neutral-800">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              {a.departments.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-neutral-500 dark:text-neutral-400">Depts:</span>{' '}
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {a.departments.map((d) => d.name).join(', ')}
                  </span>
                </div>
              )}
              {a.positions.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-neutral-500 dark:text-neutral-400">Positions:</span>{' '}
                  <span className="text-neutral-700 dark:text-neutral-300">{a.positions.join(', ')}</span>
                </div>
              )}
              {a.users.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-neutral-500 dark:text-neutral-400">Users:</span>{' '}
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {a.users.map((u) => u.full_name).join(', ')}
                  </span>
                </div>
              )}
              {a.notes && (
                <div className="text-xs text-neutral-400 mt-1">{a.notes}</div>
              )}
            </div>
            <button
              onClick={() => handleDelete(a.assignment_id)}
              className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
              title="Remove assignment"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      {assignments.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-4">No assignments yet.</p>
      )}
    </div>
  );
}
