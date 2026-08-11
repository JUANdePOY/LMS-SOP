export default function DiscussionTable({ discussions, onReply, onToggle }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Topic</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Replies</th>
            <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
            <th className="text-right px-3 py-2 font-medium text-neutral-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {discussions?.map((d) => (
            <tr key={d.id} className="border-b border-[var(--border)] last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <td className="px-3 py-2">{d.title}</td>
              <td className="px-3 py-2 text-neutral-500">{d.replyCount ?? 0}</td>
              <td className="px-3 py-2 text-neutral-500">{d.isOpen ? "Open" : "Closed"}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onToggle?.(d)} className="text-xs text-[var(--color-primary)] hover:underline">{d.isOpen ? "Close" : "Open"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
