export default function CourseCreateForm({ onSubmit, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSubmit(Object.fromEntries(fd.entries()));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
        <input name="title" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
        <textarea name="description" rows={4} required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Category</label>
        <select name="category" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="">Select category</option>
          <option value="leadership">Leadership</option>
          <option value="compliance">Compliance</option>
          <option value="technical">Technical</option>
          <option value="soft_skills">Soft Skills</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Difficulty</label>
        <select name="difficulty" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Cancel</button>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">Create Course</button>
      </div>
    </form>
  );
}
