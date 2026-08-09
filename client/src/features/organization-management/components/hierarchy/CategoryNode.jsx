import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Tag, FileText, Loader2, Plus } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';
import SopCard from './SopCard';
import { getDepartmentSops } from '../../api/hierarchy.api';

export default function CategoryNode({ category, departmentId }) {
  const { expandedCategoryIds, toggleCategory, openCreateSop } = useHierarchyContext();
  const isExpanded = expandedCategoryIds.has(category.id);

  const [sops, setSops] = useState(null);
  const [loadingSops, setLoadingSops] = useState(false);
  const [sopError, setSopError] = useState(null);

  useEffect(() => {
    if (!isExpanded || sops !== null) return;

    let cancelled = false;
    setLoadingSops(true);
    setSopError(null);

    getDepartmentSops(departmentId, category.id)
      .then((response) => {
        if (cancelled) return;
        const payload = response.data?.data;
        const rows = payload?.rows ?? (Array.isArray(payload) ? payload : []);
        setSops(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setSopError(err?.response?.data?.message || err?.message || 'Unable to load SOPs');
      })
      .finally(() => {
        if (!cancelled) setLoadingSops(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isExpanded, sops, category.id, departmentId]);

  const handleRowClick = () => {
    toggleCategory(category.id);
  };

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={handleRowClick}
        aria-expanded={isExpanded}
        className={`flex w-full items-center gap-2.5 rounded-lg pl-3.5 pr-2.5 py-2 text-left border transition-colors ${
          isExpanded
            ? 'border-emerald-200 bg-emerald-500/5 dark:border-emerald-900/60 dark:bg-emerald-500/10'
            : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-hover)]'
        }`}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
        )}

        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
          <Tag className="h-4 w-4 text-emerald-500" />
        </span>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{category.name}</p>
        </div>

        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
          <FileText className="h-3.5 w-3.5" />
          {category.sop_count ?? 0}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-[42px] mt-2 mb-1 border-t border-[var(--border)] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="mb-0 text-xs font-semibold tracking-wide text-[var(--text-muted)]">
              SOPS {sops ? `(${sops.length})` : ''}
            </p>
            <button
              type="button"
              onClick={() => openCreateSop(departmentId, category.id)}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Create SOP in this category"
            >
              <Plus className="h-3 w-3" />
              Create
            </button>
          </div>

          {loadingSops && (
            <div className="flex items-center gap-2 py-4 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading SOPs...
            </div>
          )}

          {!loadingSops && sopError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {sopError}
            </div>
          )}

          {!loadingSops && !sopError && sops && sops.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No SOPs found for this category.</p>
          )}

          {!loadingSops && !sopError && sops && sops.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sops.map((sop) => (
                <SopCard key={sop.id} sop={sop} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
