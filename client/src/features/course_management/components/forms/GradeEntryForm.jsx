export default function GradeEntryForm({ submission, onSubmit, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Score</label>
        <input name="score" type="number" min="0" step="0.01" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Feedback</label>
        <textarea name="feedback" rows={3} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Cancel</button>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm btn-primary">Submit Grade</button>
      </div>
    </form>
  );
}
