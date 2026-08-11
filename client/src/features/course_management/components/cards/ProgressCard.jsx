export default function ProgressCard({ progress }) {
  const completed = progress.completed ?? 0;
  const total = progress.total ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
      <h4 className="text-sm font-medium">{progress.moduleTitle ?? "Module"}</h4>
      <div className="mt-2 h-2 w-full rounded-full bg-gray-100 dark:bg-neutral-700 overflow-hidden">
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-neutral-500 mt-1">{completed}/{total} complete ({pct}%)</p>
    </div>
  );
}
