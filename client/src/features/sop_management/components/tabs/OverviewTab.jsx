export default function OverviewTab({ sop }) {
  if (!sop) return null;

  return (
    <div className="space-y-6">
      {/* Basic details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{sop.status || 'Draft'}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{sop.code || '—'}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Version</div>
          <div className="mt-1 text-lg font-semibold text-foreground">{sop.version || '1.0'}</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Department</div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {sop.department_name || sop.department_id || '—'}
          </div>
        </div>
      </div>

      {/* Description */}
      {sop.description && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</div>
          <p className="mt-2 text-sm leading-6 text-foreground">{sop.description}</p>
        </div>
      )}

      {/* Meta */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</div>
          <div className="mt-1 text-sm text-foreground">
            {sop.created_at ? new Date(sop.created_at).toLocaleString() : '—'}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Owner</div>
          <div className="mt-1 text-sm text-foreground">
            {sop.owner_name || (sop.owner_user_id != null ? `User #${sop.owner_user_id}` : '—')}
          </div>
        </div>
      </div>
    </div>
  );
}