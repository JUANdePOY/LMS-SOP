import { FolderTree, User, FileText } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';

export default function SubDepartmentList({ subDepartments = [], depth = 1 }) {
  const { selectDepartment, selectedDepartment } = useHierarchyContext();

  return (
    <div className="border-l border-[var(--border)] ml-[18px] pl-1">
      {subDepartments.map((subDept) => {
        const isSelected = selectedDepartment?.id === subDept.id;
        return (
          <div
            key={subDept.id}
            onClick={() => selectDepartment(subDept)}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors select-none ${
              depth > 1 ? 'ml-6' : ''
            } ${isSelected ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}`}
          >
            <div className="w-3.5 shrink-0" />
            <FolderTree className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="flex-1 min-w-0 truncate text-sm text-[var(--text-primary)]">{subDept.name}</p>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] shrink-0">
              {subDept.head_name && (
                <span className="hidden sm:flex items-center gap-1" title={`Head: ${subDept.head_name}`}>
                  <User className="h-3 w-3" />
                  {subDept.head_name}
                </span>
              )}
              <span className="flex items-center gap-1" title="SOPs">
                <FileText className="h-3 w-3" />
                {subDept.sop_count || 0}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
