export default function AssignmentCard({ assignment, onAction }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
      <h4 className="text-sm font-medium">{assignment.title}</h4>
      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{assignment.description}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
        <span>Due: {assignment.dueDate ?? ""}</span>
        <span>Max: {assignment.maxScore ?? 0} pts</span>
      </div>
    </div>
  );
}
