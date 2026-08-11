import { FileText, Tag, Share2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SopCard({ sop }) {
  const navigate = useNavigate();
  const href = sop.file_url || sop.url || null;
  const status = sop.status || 'active';
  // is_assigned_department is only present when the SOP list was fetched
  // with a department_id filter (i.e. from the hierarchy tree). It's true
  // whenever this department has an explicit assignment_departments row for
  // the SOP — regardless of whether this department also happens to be the
  // legacy "owner" (sops.department_id). Ownership is intentionally ignored
  // here: the badge means "assigned here," nothing more.
  const isAssigned = Boolean(sop.is_assigned_department);

  const handleCardClick = () => {
    navigate(`/sops/${sop.id}`);
  };

  const handleExternalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <button
      type="button"
      onClick={handleCardClick}
      className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left transition-colors hover:border-blue-300 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{sop.title}</p>
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {sop.version && (
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            v{sop.version}
          </p>
        )}
        {isAssigned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
            <Share2 className="h-2.5 w-2.5" />
            Assigned
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <FileText className="h-3 w-3" />
          {sop.updated_at ? `Updated ${new Date(sop.updated_at).toLocaleDateString()}` : 'SOP document'}
        </span>
        <div className="flex items-center gap-0.5">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleExternalClick}
              className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              aria-label="Open external file"
              title="Open external file"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <span className="rounded-md p-1 text-[var(--text-muted)]">
            <Tag className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
