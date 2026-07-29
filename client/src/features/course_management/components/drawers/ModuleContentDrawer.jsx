export default function ModuleContentDrawer({ module, courseId, open, onClose }) {
  return (
    <div className={`fixed inset-y-0 right-0 z-40 w-[400px] bg-white dark:bg-neutral-900 border-l border-[var(--border)] p-4 transform transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{module?.title ?? "Module Content"}</h2>
        <button onClick={onClose} className="text-sm text-neutral-500 hover:text-neutral-900">Close</button>
      </div>
      <div className="mt-4">
        <p className="text-sm text-neutral-600">{module?.description}</p>
      </div>
    </div>
  );
}
