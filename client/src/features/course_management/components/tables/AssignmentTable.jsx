export default function AssignmentTable({ assignments, onGrade }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Due Date</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Max Score</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments?.map((a) => (
            <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2">{a.title}</td>
              <td className="px-3 py-2 text-neutral-500">{a.dueDate ?? ""}</td>
              <td className="px-3 py-2 text-neutral-500">{a.maxScore ?? 0}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onGrade?.(a)} className="text-xs text-[var(--color-primary)] hover:underline">Grade</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
