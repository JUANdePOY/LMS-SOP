import { useState } from 'react';

function SOPEditForm({
  sop,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  onCancel,
  onSave,
  editIsDefaultOnboarding,
  setEditIsDefaultOnboarding,
}) {
  const [timeLimit, setTimeLimit] = useState(sop?.min_time_limit ? String(Number(sop.min_time_limit) / 60) : '');

  const handleSave = () => {
    onSave(sop.id, {
      min_time_limit: timeLimit === '' ? null : Number(timeLimit) * 60,
    });
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SOP Title</label>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="SOP Title"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description (optional)</label>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
          rows={2}
        />
      </div>

      <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="edit_is_default_onboarding"
            checked={editIsDefaultOnboarding || false}
            onChange={(e) => setEditIsDefaultOnboarding(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="edit_is_default_onboarding" className="text-sm font-medium text-[var(--text-primary)]">
            Required for new employee onboarding
          </label>
        </div>
        <p className="text-xs text-[var(--text-muted)] -mt-1">
          New employees must read and acknowledge this SOP before accessing employee features.
        </p>

        {(editIsDefaultOnboarding) && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Minimum time to complete (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default SOPEditForm;