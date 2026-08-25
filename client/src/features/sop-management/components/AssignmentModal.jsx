import { useState } from 'react';
import { X } from 'lucide-react';
import AssignmentForm from './AssignmentForm';
import AssignmentList from './AssignmentList';
import { useToast } from '@/shared/components/ui/Toast';

export default function AssignmentModal({ sopId, open, onClose }) {
  const { toast } = useToast();
  const [refreshSignal, setRefreshSignal] = useState(0);

  if (!open) return null;

  const handleCreated = () => {
    setRefreshSignal((n) => n + 1);
    toast.success('SOP assigned successfully');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Assign SOP</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Assign this SOP to specific employees, an entire department, or a position.
          Employees only see the SOP after it has been assigned to them.
        </p>

        <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">Current assignments</h4>
        <AssignmentList sopId={sopId} refreshSignal={refreshSignal} />

        <div className="mt-5 border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3">Add assignment</h4>
          <AssignmentForm sopId={sopId} onCreated={handleCreated} />
        </div>
      </div>
    </div>
  );
}
