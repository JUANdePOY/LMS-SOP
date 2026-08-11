export default function ModuleCreateForm({ courseId, onSubmit, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    onSubmit({ ...data, courseId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Module Title</label>
        <input name="title" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Type</label>
        <select name="type" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="chapter">Chapter</option>
          <option value="unit">Unit</option>
          <option value="lesson">Lesson</option>
          <option value="section">Section</option>
          <option value="topic">Topic</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
        <textarea name="description" rows={3} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Cancel</button>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm btn-primary">Add Module</button>
      </div>
    </form>
  );
}
