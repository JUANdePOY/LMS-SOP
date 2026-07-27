import { ChevronDown, ChevronRight, MapPin, Users } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';
import HierarchyNode from './HierarchyNode';
import { summarizeUnitTypes, sumMembers } from './hierarchyStats';

export default function BusinessAccordion({ business, departments = [], searchActive = false }) {
  const { expandedBusinessIds, toggleBusiness } = useHierarchyContext();
  const isExpanded = expandedBusinessIds.has(business.id);
  const unitSummary = summarizeUnitTypes({ children: departments });
  const memberCount = business.member_count ?? sumMembers({ children: departments });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      <button
        onClick={() => toggleBusiness(business.id)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[var(--bg-hover)] transition-colors"
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
        )}

        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 shrink-0">
          <MapPin className="h-4 w-4 text-indigo-500" />
        </span>

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

        <div className="flex items-center gap-3 shrink-0 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {memberCount}
          </span>
          {unitSummary && <span>{unitSummary}</span>}
        </div>
      </button>

      {isExpanded && (
        departments.length > 0 ? (
          <div className="border-t border-[var(--border)] px-5 py-3 space-y-1">
            {departments.map((dept) => (
              <HierarchyNode key={dept.id} node={dept} depth={0} />
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