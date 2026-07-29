export default function AssignmentsTab({ assignments, onAdd, onGrade }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={onAdd} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Create Assignment</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {assignments?.map((a) => (
          <div key={a.id} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
            <h4 className="text-sm font-medium">{a.title}</h4>
            <p className="text-xs text-neutral-500">Due: {a.dueDate ?? "No due date"}</p>
            <div className="mt-2 flex justify-end">
              <button onClick={() => onGrade?.(a)} className="text-xs text-blue-600 hover:underline">Grade</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
