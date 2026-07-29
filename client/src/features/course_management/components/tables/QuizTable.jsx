export default function QuizTable({ quizzes, onEdit, onDelete, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Questions</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Time Limit</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {quizzes?.map((q) => (
            <tr key={q.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2">{q.title}</td>
              <td className="px-3 py-2 text-neutral-500">{q.questionCount ?? 0}</td>
              <td className="px-3 py-2 text-neutral-500">{q.timeLimit ?? 0} min</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onView?.(q)} className="text-xs text-blue-600 hover:underline">View</button>
                <button onClick={() => onEdit?.(q)} className="ml-2 text-xs text-blue-600 hover:underline">Edit</button>
                <button onClick={() => onDelete?.(q.id)} className="ml-2 text-xs text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
