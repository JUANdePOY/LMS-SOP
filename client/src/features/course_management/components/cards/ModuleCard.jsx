export default function ModuleCard({ module, onAction }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
      <h4 className="text-sm font-medium">{module.title}</h4>
      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{module.description}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
        <span>{module.contentCount ?? 0} items</span>
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">{module.type}</span>
      </div>
    </div>
  );
}
