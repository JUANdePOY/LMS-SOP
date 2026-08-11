export default function ActivityTimeline({ activities }) {
  return (
    <div className="space-y-3">
      {activities?.map((a) => (
        <div key={a.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
            <div className="w-px flex-1 bg-gray-200" />
          </div>
          <div className="pb-3">
            <p className="text-sm">{a.description}</p>
            <p className="text-xs text-neutral-500">{a.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
