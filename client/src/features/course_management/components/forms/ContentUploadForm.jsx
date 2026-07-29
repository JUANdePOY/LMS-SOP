export default function ContentUploadForm({ courseId, moduleId, onSubmit, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    onSubmit({ ...data, courseId, moduleId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Content Title</label>
        <input name="title" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Type</label>
        <select name="type" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="video">Video</option>
          <option value="reading">Reading</option>
          <option value="document">Document</option>
          <option value="assignment">Assignment</option>
          <option value="quiz">Quiz</option>
          <option value="link">Link</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">URL (optional)</label>
        <input name="url" type="url" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Duration (minutes)</label>
        <input name="duration" type="number" min="0" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Cancel</button>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">Add Content</button>
      </div>
    </form>
  );
}
