import { FolderTree, FileText, X } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';

export default function SelectedDepartmentPanel() {
  const { selectedDepartment, selectDepartment, openSopModal } = useHierarchyContext();

  if (!selectedDepartment) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
          <FolderTree className="h-5 w-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">{selectedDepartment.name}</p>
          <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <FileText className="h-3 w-3" />
            {selectedDepartment.sop_count || 0} SOP{selectedDepartment.sop_count === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={openSopModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          View SOPs
        </button>
        <button
          onClick={() => selectDepartment(null)}
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
