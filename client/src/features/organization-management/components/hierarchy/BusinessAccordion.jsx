import { ChevronDown, ChevronRight, Building2, Folder, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useHierarchyContext } from './HierarchyContext';
import HierarchyNode from './HierarchyNode';
import InlineCreateRow from './InlineCreateRow';
import TreeConnector from './TreeConnector';
import { getBusinessLogo } from '@/features/organization-management/api/business.api';

function BusinessLogo({ business }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!business?.id) return;
    let cancelled = false;
    let currentUrl = null;

    const fetchLogo = async () => {
      try {
        const response = await getBusinessLogo(business.id);
        if (!cancelled && response?.data) {
          currentUrl = URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] || 'image/png' }));
          setBlobUrl(currentUrl);
        }
      } catch {
        // No logo available
      }
    };

    fetchLogo();

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [business?.id]);

  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={`${business.business_name} logo`}
        className="h-9 w-9 rounded-lg object-cover shrink-0 border border-[var(--border)]"
      />
    );
  }

  const initials = (business.business_name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
      {initials || <Building2 className="h-4 w-4 text-indigo-500" />}
    </span>
  );
}

export default function BusinessAccordion({
  business,
  departments = [],
  searchActive = false,
  creating = false,
  creatingDepartmentFor,
  onInlineCreateDepartment,
  onInlineCreateCategory,
  onInlineCreateSop,
}) {
  const { expandedBusinessIds, toggleBusiness, startCreateDepartment, cancelCreateDepartment } = useHierarchyContext();
  const isExpanded = expandedBusinessIds.has(business.id);
  const isCreatingDept = creatingDepartmentFor === business.id;

  const handleCreateDepartmentClick = (event) => {
    event.stopPropagation();
    if (isCreatingDept) {
      cancelCreateDepartment();
      return;
    }
    if (!isExpanded) toggleBusiness(business.id);
    startCreateDepartment(business.id);
  };

  const departmentCreateRow = isCreatingDept ? (
    <div className="py-1 first:pt-0 last:pb-0">
            <InlineCreateRow
            icon={Folder}
            label="Department"
            defaultValue="Untitled Department"
            loading={creating}
            onConfirm={(name) => onInlineCreateDepartment(business.id, name)}
            onCancel={cancelCreateDepartment}
          />
    </div>
  ) : null;
  
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      <div className="relative">
        {isExpanded && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-blue-500" />}
        {/* Split the header into two sibling buttons so the create-action button
            never nests inside the expand/collapse toggle button (avoids
            validateDOMNesting: <button> inside <button>). */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => toggleBusiness(business.id)}
            className={`flex flex-1 min-w-0 items-center gap-3 pl-6 pr-5 py-2 text-left transition-colors ${
              isExpanded ? 'bg-blue-500/5 dark:bg-blue-500/10' : 'hover:bg-[var(--bg-hover)]'
            }`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
            )}

            <BusinessLogo business={business} />

            <div className="flex-1 min-w-0 flex items-center gap-2">
              <p className="font-semibold text-[var(--text-primary)] truncate">{business.business_name}</p>
              {business.business_code && (
                <span className="shrink-0 rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {business.business_code}
                </span>
              )}
              {business.scope && (
                <span className="hidden sm:inline-flex shrink-0 rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {business.scope}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={handleCreateDepartmentClick}
            disabled={creating}
            className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] w-8 h-8 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0 disabled:opacity-50"
            aria-label="Create Department"
            title="Create Department"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        departments.length > 0 ? (
          <div className="border-t border-[var(--border)] px-5 py-3">
            {departmentCreateRow}
            <div className="relative border-l-2 border-[var(--border)] pl-4 space-y-1">
              {departments.map((dept, idx) => (
                <TreeConnector key={dept.id} isLast={idx === departments.length - 1} stubTop={19}>
                  <HierarchyNode
                    node={dept}
                    depth={0}
                    creating={creating}
                    onInlineCreateCategory={onInlineCreateCategory}
                    onInlineCreateSop={onInlineCreateSop}
                  />
                </TreeConnector>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t border-[var(--border)] px-5 py-3">
            {departmentCreateRow}
            <div className="py-6 text-center text-sm text-[var(--text-muted)]">
              {searchActive ? 'No departments match your search.' : 'No departments yet.'}
            </div>
          </div>
        )
      )}
    </div>
  );
}