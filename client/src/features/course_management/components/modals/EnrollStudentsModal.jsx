export default function EnrollStudentsModal({ open, onClose, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const userIds = fd.get("userIds")?.toString().split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    onSubmit({ userIds });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[450px] max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Enroll Students</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <textarea name="userIds" placeholder="Enter user IDs separated by commas" rows={4} required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg px-4 py-2 text-sm btn-primary">Enroll</button>
        </form>
      </div>
    </div>
  );
}
