export default function GradeCard({ grade, user }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{user?.full_name ?? "Student"}</h4>
          <p className="text-xs text-neutral-500">{user?.email ?? ""}</p>
        </div>
        <span className="text-sm font-bold">{grade.score ?? 0} / {grade.maxScore ?? 0}</span>
      </div>
      {grade.feedback && <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{grade.feedback}</p>}
    </div>
  );
}
