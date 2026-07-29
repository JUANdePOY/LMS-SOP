import { ChevronDown, ChevronRight, FolderTree, User, FileText } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';
import SubDepartmentList from './SubDepartmentList';

export default function DepartmentAccordion({ department, depth = 0 }) {
  const { expandedDeptIds, toggleDepartment, selectDepartment, selectedDepartment } = useHierarchyContext();
  const hasChildren = department.children && department.children.length > 0;
  const isExpanded = expandedDeptIds.has(department.id);
  const isSelected = selectedDepartment?.id === department.id;

  const handleRowClick = () => {
    if (hasChildren) {
      toggleDepartment(department.id);
    } else {
      selectDepartment(department);
    }
  };

  return (
    <div className="select-none">
      <div
        onClick={handleRowClick}
        className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors ${
          depth > 0 ? 'ml-6' : ''
        } ${isSelected ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}`}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
          )
        ) : (
          <div className="w-3.5 shrink-0" />
        )}

        <FolderTree className="h-4 w-4 text-amber-500 shrink-0" />

        <p className="flex-1 min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">
          {department.name}
        </p>

        {/* Metadata is always visible (not hover-only) so it works on touch devices */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] shrink-0">
          {department.head_name && (
            <span className="hidden sm:flex items-center gap-1" title={`Head: ${department.head_name}`}>
              <User className="h-3 w-3" />
              {department.head_name}
            </span>
          )}
          <span className="flex items-center gap-1" title="SOPs">
            <FileText className="h-3 w-3" />
            {department.sop_count || 0}
          </span>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <SubDepartmentList subDepartments={department.children} depth={depth + 1} />
      )}
    </div>
  );
}
