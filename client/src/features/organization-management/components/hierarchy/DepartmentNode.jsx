import { ChevronDown, ChevronRight, FolderTree, User, FileText, Users } from 'lucide-react';
import { useState } from 'react';

export default function DepartmentNode({ department, onSelect, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = department.children && department.children.length > 0;

  const toggleExpand = (e) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  const handleSelect = () => {
    if (onSelect) onSelect(department);
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors group ${
          depth > 0 ? 'ml-6' : ''
        }`}
        onClick={handleSelect}
      >
        <button
          onClick={toggleExpand}
          className="p-0.5 rounded hover:bg-[var(--bg-active)] transition-colors"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
            )
          ) : (
            <div className="w-3" />
          )}
        </button>

        <FolderTree className="h-3.5 w-3.5 text-amber-500 shrink-0" />

        <p className="text-sm text-[var(--text-primary)] truncate flex-1">{department.name}</p>

        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
          {department.head_name && (
            <span className="flex items-center gap-1" title={department.head_name}>
              <User className="h-3 w-3" />
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {department.user_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {department.sop_count || 0}
          </span>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="border-l border-[var(--border)] ml-[18px] pl-1">
          {department.children.map((child) => (
            <DepartmentNode
              key={child.id}
              department={child}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

