export default function ArchiveCourseModal({ open, onClose, onConfirm, course }) {
  if (!open || !course) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[400px] rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Archive Course</h2>
        <p className="text-sm text-neutral-600 mt-2">
          Are you sure you want to archive <span className="font-semibold">{course.title}</span>? This will hide it from students.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg px-4 py-2 text-sm bg-amber-600 text-white">Archive</button>
        </div>
      </div>
    </div>
  );
}
