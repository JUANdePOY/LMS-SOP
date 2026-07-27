import { ChevronDown, ChevronRight, Layers, Users } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';
import LeafCard from './LeafCard';
import { countLeaves, isLeafNode, sumMembers } from './hierarchyStats';

function StatBadge({ node }) {
  if (isLeafNode(node)) return null;
  const { total, active } = countLeaves(node);
  const memberCount = node.member_count ?? sumMembers(node);

  return (
    <div className="flex items-center gap-3 shrink-0 text-xs">
      <span className="flex items-center gap-1 text-[var(--text-muted)]">
        <Users className="h-3.5 w-3.5" />
        {memberCount}
      </span>
      <span className="font-medium text-emerald-600 dark:text-emerald-400">
        {active}/{total} active
      </span>
    </div>
  );
}

export default function HierarchyNode({ node, depth = 0 }) {
  const { expandedDeptIds, toggleDepartment, selectDepartment, selectedDepartment } = useHierarchyContext();
  const hasChildren = !isLeafNode(node);
  const isExpanded = expandedDeptIds.has(node.id);
  const isSelected = selectedDepartment?.id === node.id;
  const childrenAreLeaves = hasChildren && node.children.every(isLeafNode);

  const handleRowClick = () => {
    if (hasChildren) toggleDepartment(node.id);
    else selectDepartment(node);
  };

  return (
    <div className="select-none">
      <div
        onClick={handleRowClick}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 cursor-pointer transition-colors ${
          isSelected ? 'bg-[var(--bg-active)]' : isExpanded ? 'bg-blue-500/5' : 'hover:bg-[var(--bg-hover)]'
        }`}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          )
        ) : (
          <span className="w-4 shrink-0" />
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

        <StatBadge node={node} />
      </div>

      {isExpanded && hasChildren && (
        childrenAreLeaves ? (
          <div className="ml-[42px] mt-2 mb-1">
            <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-muted)]">
              {(node.children_label || 'UNITS').toUpperCase()} ({node.children.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {node.children.map((child) => (
                <LeafCard key={child.id} node={child} />
              ))}
            </div>
          </div>
        ) : (
          <div className="relative ml-[28px] mt-1 space-y-1 border-l border-[var(--border)] pl-4">
            {node.children.map((child) => (
              <div key={child.id} className="relative">
                <span className="absolute -left-4 top-[19px] h-px w-4 bg-[var(--border)]" />
                <HierarchyNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
