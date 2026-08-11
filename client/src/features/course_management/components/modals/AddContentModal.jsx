export default function AddContentModal({ open, onClose, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSubmit(Object.fromEntries(fd.entries()));
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[450px] max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Add Content</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input name="title" placeholder="Content title" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <select name="type" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <option value="video">Video</option>
            <option value="reading">Reading</option>
            <option value="document">Document</option>
            <option value="quiz">Quiz</option>
            <option value="assignment">Assignment</option>
          </select>
          <input name="url" placeholder="URL (optional)" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm btn-primary">Add Content</button>
        </form>
      </div>
    </div>
  );
}
