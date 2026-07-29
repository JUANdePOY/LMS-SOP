export default function AnalyticsTab({ analytics, onExport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
          <p className="text-xs text-neutral-500">Enrollment</p>
          <p className="text-lg font-bold">{analytics?.enrollment ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
          <p className="text-xs text-neutral-500">Completion</p>
          <p className="text-lg font-bold">{analytics?.completionRate ?? 0}%</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
          <p className="text-xs text-neutral-500">Avg Grade</p>
          <p className="text-lg font-bold">{analytics?.avgGrade ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
          <p className="text-xs text-neutral-500">Avg Time</p>
          <p className="text-lg font-bold">{analytics?.avgTime ?? 0} min</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={onExport} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Export Report</button>
      </div>
    </div>
  );
}
