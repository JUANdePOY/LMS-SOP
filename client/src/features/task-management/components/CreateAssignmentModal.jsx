import { useState, useEffect, memo } from 'react';
import { X, Users } from 'lucide-react';
import AssignmentInput from './AssignmentInput';

const CreateAssignmentModal = memo(function CreateAssignmentModal({ open, onClose, onSubmit, initialAssignments }) {
  const [draft, setDraft] = useState(
    (initialAssignments || []).map((a) => ({ assignment_type: a.assignment_type, reference_id: a.reference_id, reference_name: a.reference_name }))
  );

  useEffect(() => {
    if (open) {
      setDraft(
        (initialAssignments || []).map((a) => ({ assignment_type: a.assignment_type, reference_id: a.reference_id, reference_name: a.reference_name }))
      );
    }
  }, [open, initialAssignments]);

  if (!open) return null;

  const update = (idx, updated) => {
    setDraft((prev) => prev.map((a, i) => (i === idx ? { ...a, ...updated } : a)));
  };
  const remove = (idx) => setDraft((prev) => prev.filter((_, i) => i !== idx));
  const add = () => setDraft((prev) => [...prev, { assignment_type: 'User', reference_id: '', reference_name: '' }]);

  const handleDone = () => {
    onSubmit(draft.filter((a) => a.reference_id || a.reference_name));
    onClose();
  };

  const handleClose = () => {
    setDraft([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:bg-[var(--color-primary)]/15 dark:text-[var(--color-primary)]">
              <Users size={15} />
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Assignments</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 -mr-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4">
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {draft.length === 0 && <p className="text-xs text-[var(--text-muted)]">No assignments yet.</p>}
            {draft.map((a, idx) => (
              <AssignmentInput key={idx} assignment={a} onUpdate={(u) => update(idx, u)} onRemove={() => remove(idx)} canRemove />
            ))}
          </div>
          <button type="button" onClick={add} className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">
            + Add assignment
          </button>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 sm:px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg px-3.5 py-2 text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
});

export default CreateAssignmentModal;
