export default function ContentTable({ contents, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Type</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Duration</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contents?.map((c) => (
            <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2">{c.title}</td>
              <td className="px-3 py-2 text-neutral-500">{c.type}</td>
              <td className="px-3 py-2 text-neutral-500">{c.duration ?? 0} min</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onEdit?.(c)} className="text-xs text-[var(--color-primary)] hover:underline">Edit</button>
                <button onClick={() => onDelete?.(c.id)} className="ml-2 text-xs text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
