export default function ModulesTab({ modules, onAdd, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={onAdd} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Add Module</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules?.map((m) => (
          <div key={m.id} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
            <h4 className="text-sm font-medium">{m.title}</h4>
            <p className="text-xs text-neutral-500">{m.description}</p>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => onEdit?.(m)} className="text-xs text-blue-600 hover:underline">Edit</button>
              <button onClick={() => onDelete?.(m.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
