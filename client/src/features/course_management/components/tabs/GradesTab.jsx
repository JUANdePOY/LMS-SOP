export default function GradesTab({ grades, onGrade }) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Student</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Score</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Max</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-500">Grade</th>
              <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grades?.map((g) => (
              <tr key={g.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td className="px-3 py-2">{g.studentName ?? "Student"}</td>
                <td className="px-3 py-2">{g.score ?? "-"}</td>
                <td className="px-3 py-2 text-neutral-500">{g.maxScore ?? 0}</td>
                <td className="px-3 py-2 text-neutral-500">{g.letterGrade ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  {!g.grade && <button onClick={() => onGrade?.(g)} className="text-xs text-[var(--color-primary)] hover:underline">Grade</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
