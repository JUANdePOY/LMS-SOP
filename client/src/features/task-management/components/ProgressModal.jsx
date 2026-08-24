import { useState, useEffect, memo } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { TASK_STATUSES } from '../constants/taskConstants';

const STATUS_DOT_COLORS = {
  'Not Started': 'bg-neutral-400',
  'In Progress': 'bg-blue-500',
  'On Hold': 'bg-amber-500',
  'Completed': 'bg-emerald-500',
};

const DEFAULT_DOT_COLOR = 'bg-neutral-400';

const ProgressModal = memo(function ProgressModal({ open, onClose, onSubmit, saving, taskId, initialProgress }) {
  const [completionRate, setCompletionRate] = useState(initialProgress ? Number(initialProgress) : 0);
  const [status, setStatus] = useState(initialProgress ? (initialProgress.status || 'In Progress') : 'In Progress');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && initialProgress) {
      setCompletionRate(Number(initialProgress.completion_rate || 0));
      setStatus(initialProgress.status || 'In Progress');
    }
  }, [open, initialProgress]);

  useEffect(() => {
    if (status === 'Completed' && Number(completionRate) !== 100) {
      setCompletionRate(100);
    }
  }, [status, completionRate]);

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
      task_id: taskId,
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

  const rateNum = Number(completionRate);
  const sliderFillColor = 'var(--color-primary)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:bg-[var(--color-primary)]/15 dark:text-[var(--color-primary)]">
              <TrendingUp size={15} />
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Update Progress</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 -mr-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Completion Rate</label>
              <span
                className="text-sm font-semibold tabular-nums px-2 py-0.5 rounded-full"
                style={{ color: sliderFillColor, backgroundColor: `${sliderFillColor}1a` }}
              >
                {completionRate}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={completionRate}
              onChange={(e) => {
                setCompletionRate(e.target.value);
                if (errors.completionRate) setErrors((prev) => ({ ...prev, completionRate: undefined }));
              }}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[var(--color-primary)]"
              style={{
                background: `linear-gradient(to right, ${sliderFillColor} ${rateNum}%, var(--bg-hover) ${rateNum}%)`,
              }}
            />
            {errors.completionRate && <p className="text-xs text-red-500 mt-1.5">{errors.completionRate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Status</label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status] || DEFAULT_DOT_COLOR}`} />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pl-7 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              >
                {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Progress notes..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder:text-[var(--text-muted)] resize-none transition-colors"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 sm:px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-lg px-3.5 py-2 text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ProgressModal;
