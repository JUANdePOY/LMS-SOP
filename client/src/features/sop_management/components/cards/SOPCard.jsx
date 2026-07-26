import { FileText } from 'lucide-react';
import { buttonVariants } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';

function StatusBadge({ status }) {
  const colors = {
    Draft: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border)]',
    'For Review': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
    Approved: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40',
    Published: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
    Archived: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40',
  };

  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}>
      {status || 'Draft'}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SOPCard({ sop, onClick }) {
  if (!sop) return null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(sop.id)}
      className="group flex w-full flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Icon avatar + status badge */}
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
          <FileText className="h-5 w-5" />
        </div>
        <StatusBadge status={sop.status} />
      </div>

      {/* Subtitle + title */}
      <div className="min-w-0">
        <p className="truncate text-xs text-[var(--text-muted)]">
          {sop.code || 'No code'} · Updated {formatDate(sop.updated_at)}
        </p>
        <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text-primary)]">
          {sop.title || 'Untitled SOP'}
        </h2>
      </div>

      {/* Tag pills */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
          {sop.department_name || (sop.department_id ? `Dept #${sop.department_id}` : 'No department')}
        </span>
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
          {sop.owner_name || 'Unassigned'}
        </span>
      </div>

      {/* Bottom row: description + action */}
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--border)] pt-4">
        <p className="line-clamp-1 min-w-0 flex-1 text-sm text-[var(--text-muted)]">
          {sop.description || 'No description provided.'}
        </p>
        <span className={cn(buttonVariants({ size: 'sm' }), 'pointer-events-none shrink-0')}>
          View SOP
        </span>
      </div>
    </button>
  );
}