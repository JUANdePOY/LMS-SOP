export default function QuizzesTab({ quizzes, onAdd, onView }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={onAdd} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Create Quiz</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {quizzes?.map((q) => (
          <div key={q.id} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
            <h4 className="text-sm font-medium">{q.title}</h4>
            <p className="text-xs text-neutral-500">{q.description}</p>
            <div className="mt-2 flex justify-end">
              <button onClick={() => onView?.(q)} className="text-xs text-blue-600 hover:underline">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
