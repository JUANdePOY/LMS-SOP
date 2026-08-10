import { ChevronDown, ChevronRight, Building2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useHierarchyContext } from './HierarchyContext';
import HierarchyNode from './HierarchyNode';
import { summarizeUnitTypes, sumMembers } from './hierarchyStats';
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

export default function BusinessAccordion({ business, departments = [], searchActive = false, onCreateSop }) {
  const { expandedBusinessIds, toggleBusiness } = useHierarchyContext();
  const isExpanded = expandedBusinessIds.has(business.id);
  const unitSummary = summarizeUnitTypes({ children: departments });
  const memberCount = business.member_count ?? sumMembers({ children: departments });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      <div className="relative">
        {isExpanded && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-blue-500" />}
        <button
          onClick={() => toggleBusiness(business.id)}
          className={`flex w-full items-center gap-3 pl-6 pr-5 py-2 text-left transition-colors ${
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
          {onCreateSop && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateSop(business.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
              aria-label="Create SOP"
              title="Create"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Create</span>
            </button>
          )}

        </button>
      </div>

      {isExpanded && (
        departments.length > 0 ? (
          <div className="border-t border-[var(--border)] px-5 py-3 divide-y divide-[var(--border)]">
            {departments.map((dept) => (
              <div key={dept.id} className="py-1 first:pt-0 last:pb-0">
                <HierarchyNode node={dept} depth={0} />
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t border-[var(--border)] px-5 py-6 text-center text-sm text-[var(--text-muted)]">
            {searchActive ? 'No departments match your search.' : 'No departments yet.'}
          </div>
        )
      )}
    </div>
  );
}