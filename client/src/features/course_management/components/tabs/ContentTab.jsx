export default function ContentTab({ contents, onAdd, onEdit, onDelete, onView }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={onAdd} className="rounded-lg px-3 py-1.5 text-sm btn-primary">Add Content</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contents?.map((c) => (
          <div key={c.id} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
            <h4 className="text-sm font-medium">{c.title}</h4>
            <p className="text-xs text-neutral-500">{c.type}</p>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => onView?.(c)} className="text-xs text-[var(--color-primary)] hover:underline">View</button>
              <button onClick={() => onEdit?.(c)} className="text-xs text-[var(--color-primary)] hover:underline">Edit</button>
              <button onClick={() => onDelete?.(c.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
