export default function LessonProgressBar({ completed, total, modules = [], className = "" }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const modulePct = modules?.length
    ? Math.round(
        modules.reduce((sum, m) => sum + (m.completedLessonCount || 0), 0) /
          Math.max(1, modules.reduce((sum, m) => sum + (m.totalLessonCount || 0), 0)) * 100
      )
    : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-neutral-700 overflow-hidden">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{completed}/{total} lessons ({pct}%)</span>
        {modulePct !== null && <span>{modulePct}% modules</span>}
      </div>
    </div>
  );
}
