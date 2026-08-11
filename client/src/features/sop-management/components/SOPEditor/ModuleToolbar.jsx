

import { ActionIcons } from '@/shared/components/ui/actionIcons';

function ModuleToolbar({ onAdd, onReorder }) {
  return (
    <div className="module-toolbar flex items-center gap-2 mb-3">
      <button
        onClick={onAdd}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
      >
        <ActionIcons.Add className="w-4 h-4" />
        Add Module
      </button>
      <button
        onClick={onReorder}
        className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        title="Reorder modules"
        aria-label="Reorder modules"
      >
        <ActionIcons.Reorder className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ModuleToolbar;
