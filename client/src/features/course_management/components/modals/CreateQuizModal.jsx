export default function CreateQuizModal({ open, onClose, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    onSubmit(Object.fromEntries(fd.entries()));
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[450px] max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Create Quiz</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input name="title" placeholder="Quiz title" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <textarea name="description" placeholder="Description" rows={3} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <input name="timeLimit" type="number" placeholder="Time limit (min)" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">Create Quiz</button>
        </form>
      </div>
    </div>
  );
}
