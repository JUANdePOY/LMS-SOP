import { MapPin, Users, Tag } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';

const STATUS_STYLES = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  inactive: 'bg-gray-500/10 text-[var(--text-muted)]',
};

export default function LeafCard({ node }) {
  const { selectDepartment, selectedDepartment } = useHierarchyContext();
  const isSelected = selectedDepartment?.id === node.id;
  const status = node.status || 'active';
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const memberCount = node.member_count ?? 0;

  return (
    <button
      type="button"
      onClick={() => selectDepartment(node)}
      className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
        isSelected
          ? 'border-blue-400 bg-[var(--bg-active)]'
          : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{node.name}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            STATUS_STYLES[status] || STATUS_STYLES.active
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {node.code && (
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {node.code}
        </p>
      )}

      {node.location && (
        <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <MapPin className="h-3 w-3 shrink-0" />
          {node.location}
        </p>
      )}

      <div className="mt-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Users className="h-3 w-3" />
          {memberCount} member{memberCount === 1 ? '' : 's'}
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
