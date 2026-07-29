export default function LearnerTable({ learners, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Name</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Email</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Progress</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Grade</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {learners?.map((l) => (
            <tr key={l.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2">{l.full_name ?? "Learner"}</td>
              <td className="px-3 py-2 text-neutral-500">{l.email ?? ""}</td>
              <td className="px-3 py-2 text-neutral-500">{l.progress ?? 0}%</td>
              <td className="px-3 py-2 text-neutral-500">{l.grade ?? "-"}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onView?.(l)} className="text-xs text-blue-600 hover:underline">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
