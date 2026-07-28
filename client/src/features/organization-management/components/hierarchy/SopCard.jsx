import { FileText, Tag } from 'lucide-react';

export default function SopCard({ sop }) {
  const href = sop.file_url || sop.url || null;
  const status = sop.status || 'active';

  return (
    <button
      type="button"
      onClick={() => href && window.open(href, '_blank', 'noopener')}
      className={`flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left transition-colors ${
        href ? 'hover:border-blue-300 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{sop.title}</p>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {sop.version && (
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          v{sop.version}
        </p>
      )}

      <div className="mt-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <FileText className="h-3 w-3" />
          {sop.updated_at ? `Updated ${new Date(sop.updated_at).toLocaleDateString()}` : 'SOP document'}
        </span>
        <span
          className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          aria-label="Tags"
        >
          <Tag className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}