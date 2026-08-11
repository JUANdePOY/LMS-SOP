import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Users, FileText, Loader2, Plus } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';
import SopCard from './SopCard';
import CategoryNode from './CategoryNode';
import { countLeaves, isLeafNode, sumMembers } from './hierarchyStats';
import { getDepartmentSops } from '../../api/hierarchy.api';

function StatBadge({ node }) {
  if (isLeafNode(node)) return null;
  const { total, active } = countLeaves(node);
  const memberCount = node.member_count ?? sumMembers(node);

  return (
    <div className="flex items-center gap-3 shrink-0 text-xs">
      <span className="flex items-center gap-1 text-[var(--text-muted)]">
        <Users className="h-3 w-3" />
        {memberCount}
      </span>
      <span className="font-medium text-emerald-600 dark:text-emerald-400">
        {active}/{total} active
      </span>
    </div>
  );
}

export default function HierarchyNode({ node, depth = 0 }) {
  const { expandedDeptIds, toggleDepartment, openCreateSop } = useHierarchyContext();
  const hasChildren = !isLeafNode(node);
  const isExpanded = expandedDeptIds.has(node.id);

  // For leaf departments, expanding fetches & shows this department's own SOPs inline.
  const [sops, setSops] = useState(null); // null = not fetched yet
  const [loadingSops, setLoadingSops] = useState(false);
  const [sopError, setSopError] = useState(null);

  useEffect(() => {
    if (hasChildren || !isExpanded || sops !== null) return;

    let cancelled = false;
    setLoadingSops(true);
    setSopError(null);

    getDepartmentSops(node.id)
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
  }, [hasChildren, isExpanded, sops, node.id]);

  const handleRowClick = () => {
    toggleDepartment(node.id);
  };

  return (
    <div className="select-none">
      <div className="relative">
        {isExpanded && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-blue-500" />
        )}
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
          className={`flex w-full items-center gap-2.5 rounded-lg pl-3.5 pr-2.5 py-2.5 text-left border transition-colors ${
            isExpanded
              ? 'border-blue-200 bg-blue-500/5 dark:border-blue-900/60 dark:bg-blue-500/10'
              : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-hover)]'
          }`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          )}

          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 shrink-0">
            <Layers className="h-4 w-4 text-indigo-500" />
          </span>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{node.name}</p>
            {node.code && (
              <span className="hidden sm:inline-flex shrink-0 rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                {node.code}
              </span>
            )}
          </div>

          {hasChildren ? (
            <StatBadge node={node} />
          ) : (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
              <FileText className="h-3.5 w-3.5" />
              {node.sop_count ?? 0}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCreateSop(node.id, null);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Create SOP in this department"
          >
            <Plus className="h-3 w-3" />
            Create
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {hasChildren && (
            <div className="relative ml-[28px] mt-1.5 divide-y divide-[var(--border)] border-l-2 border-[var(--border)] pl-4">
              {node.children.map((child) => (
                <div key={child.id} className="relative py-1 first:pt-0 last:pb-0">
                  <span className="absolute -left-4 top-[19px] h-[2px] w-4 bg-[var(--border)]" />
                  <HierarchyNode node={child} depth={depth + 1} />
                </div>
              ))}
            </div>
          )}

          {node.categories?.length > 0 && (
            <div className="ml-[28px] mt-3">
              <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)] mb-2">
                Categories ({node.categories.length})
              </p>
              <div className="space-y-1">
                {node.categories.map((category) => (
                  <CategoryNode key={category.id} category={category} departmentId={node.id} />
                ))}
              </div>
            </div>
          )}

          {!hasChildren && (
            <div className="ml-[42px] mt-2 mb-1 border-t border-[var(--border)] pt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)]">
                  SOPS {sops ? `(${sops.length})` : ''}
                </p>
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
                <p className="text-sm text-[var(--text-muted)]">No SOPs found for this department.</p>
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
        </>
      )}
    </div>
  );
}
