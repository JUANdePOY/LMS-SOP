export default function EnrollmentCard({ enrollment, onAction, actionLabel }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{enrollment.userName ?? "Student"}</h4>
          <p className="text-xs text-neutral-500">{enrollment.userEmail ?? ""}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">{enrollment.status}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
        <span>{enrollment.enrolledAt ?? ""}</span>
        <span>{enrollment.progress ?? 0}% complete</span>
      </div>
    </div>
  );
}
