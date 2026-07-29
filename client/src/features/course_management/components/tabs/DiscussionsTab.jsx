export default function DiscussionsTab({ discussions, onCreate, onToggle }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={onCreate} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">New Discussion</button>
      </div>
      <div className="space-y-2">
        {discussions?.map((d) => (
          <div key={d.id} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{d.title}</h4>
              <button onClick={() => onToggle?.(d)} className="text-xs text-blue-600 hover:underline">{d.isOpen ? "Close" : "Open"}</button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">{d.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
