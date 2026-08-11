import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FileText, Loader2, Plus, Folder } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';
import SopFile from './SopFile';
import InlineCreateRow from './InlineCreateRow';
import TreeConnector from './TreeConnector';
import { getDepartmentSops } from '../../api/hierarchy.api';

export default function CategoryNode({
  category,
  departmentId,
  searchQuery = '',
  creating = false,
  onInlineCreateSop,
}) {
  const { expandedCategoryIds, toggleCategory, startCreateSop, cancelCreateSop, creatingSopFor } =
    useHierarchyContext();
  const isExpanded = expandedCategoryIds.has(category.id);
  const isCreatingSop =
    creatingSopFor?.departmentId === departmentId && creatingSopFor?.categoryId === category.id;

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

  const lowerQuery = searchQuery ? searchQuery.toLowerCase() : '';
  const filteredSops = lowerQuery && Array.isArray(sops)
    ? sops.filter((sop) => (sop.title || '').toLowerCase().includes(lowerQuery))
    : sops;

  const noSopsMessage = lowerQuery
    ? 'No SOPs match your search.'
    : 'No SOPs found for this category.';

  const handleRowClick = () => {
    toggleCategory(category.id);
  };

  return (
    <div className="select-none">
            <div
        role="button"
        tabIndex="0"
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
          }
        }}
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
          <Folder className="h-4 w-4 text-emerald-500" />
        </span>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{category.name}</p>
        </div>

        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
          <FileText className="h-3.5 w-3.5" />
          {category.sop_count ?? 0}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isCreatingSop) {
              cancelCreateSop();
            } else {
              if (!isExpanded) toggleCategory(category.id);
              startCreateSop(departmentId, category.id);
            }
          }}
          disabled={creating}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          aria-label={isCreatingSop ? 'Cancel SOP creation' : 'Create SOP'}
          title={isCreatingSop ? 'Cancel SOP creation' : 'Create SOP'}
        >
          <Plus className="h-3 w-3" />
          SOP
        </button>
      </div>

      {isExpanded && (
        <div className="ml-[42px] mt-2 mb-1 border-t border-[var(--border)] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="mb-0 text-xs font-semibold tracking-wide text-[var(--text-muted)]">
              {category.name} SOPs {filteredSops ? `(${filteredSops.length})` : ''}
            </p>
          </div>

          {isCreatingSop ? (
            <div className="mb-2">
              <InlineCreateRow
                icon={FileText}
                label="SOP"
                defaultValue="Untitled SOP"
                loading={creating}
                onConfirm={(name) => onInlineCreateSop(departmentId, category.id, name)}
                onCancel={cancelCreateSop}
              />
            </div>
          ) : null}

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

          {!loadingSops && !sopError && filteredSops && filteredSops.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">{noSopsMessage}</p>
          )}

          {!loadingSops && !sopError && filteredSops && filteredSops.length > 0 && (
            <div className="relative border-l-2 border-[var(--border)] pl-4 space-y-0.5">
              {filteredSops.map((sop, idx) => (
                <TreeConnector key={sop.id} isLast={idx === filteredSops.length - 1} stubTop={15}>
                  <SopFile sop={sop} />
                </TreeConnector>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}