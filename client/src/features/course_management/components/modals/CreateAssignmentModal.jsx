export default function CreateAssignmentModal({ open, onClose, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSubmit(Object.fromEntries(fd.entries()));
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[450px] max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Create Assignment</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input name="title" placeholder="Assignment title" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <textarea name="description" placeholder="Description" rows={3} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input name="dueDate" type="date" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm btn-primary">Create Assignment</button>
        </form>
      </div>
    </div>
  );
}
