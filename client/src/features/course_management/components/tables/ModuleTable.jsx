import { ActionButton } from "@/shared/components/ui/actionIcons";

export default function ModuleTable({ modules, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Title</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Type</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Items</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {modules?.map((m) => (
            <tr key={m.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2">{m.title}</td>
              <td className="px-3 py-2 text-neutral-500">{m.type}</td>
              <td className="px-3 py-2 text-neutral-500">{m.contentCount ?? 0}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-1.5">
                  <ActionButton action="Edit" size="sm" onClick={() => onEdit?.(m)} />
                  <ActionButton action="Delete" size="sm" onClick={() => onDelete?.(m.id)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
