import { useState } from 'react';
import { TASK_STATUSES } from '../constants/taskConstants';

function ProgressModal({ open, onClose, onSubmit, saving }) {
  const [completionRate, setCompletionRate] = useState(0);
  const [status, setStatus] = useState('In Progress');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  if (!open) return null;

  const validate = () => {
    const newErrors = {};
    const rate = Number(completionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      newErrors.completionRate = 'Completion rate must be between 0 and 100';
    }
    if (status === 'Completed' && rate !== 100) {
      newErrors.completionRate = 'Completion rate must be 100% when marking as completed';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      completion_rate: Number(completionRate),
      status,
      notes: notes || null,
    });
    setCompletionRate(0);
    setStatus('In Progress');
    setNotes('');
    setErrors({});
  };

  const handleClose = () => {
    setCompletionRate(0);
    setStatus('In Progress');
    setNotes('');
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Update Progress</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Completion Rate</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={completionRate}
                onChange={(e) => {
                  setCompletionRate(e.target.value);
                  if (errors.completionRate) setErrors((prev) => ({ ...prev, completionRate: undefined }));
                }}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12 text-right">{completionRate}%</span>
            </div>
            {errors.completionRate && <p className="text-xs text-red-500 mt-1">{errors.completionRate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500">
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Progress notes..." rows={3} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-[var(--text-muted)]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 sm:px-6 py-4">
          <button onClick={handleClose} className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-1.5 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProgressModal;
