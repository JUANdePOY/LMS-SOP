export default function ContentCard({ content, onClick }) {
  return (
    <div onClick={onClick} className="cursor-pointer rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm hover:border-[rgba(242,92,5,0.30)] transition-colors">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] text-[var(--color-primary-hover)]">
          <span className="text-xs font-bold">{content.type?.[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{content.title}</h4>
          <p className="text-xs text-neutral-500">{content.duration ?? ""} {content.duration ? "min" : ""}</p>
        </div>
        {content.isRequired && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">Required</span>
        )}
      </div>
    </div>
  );
}
