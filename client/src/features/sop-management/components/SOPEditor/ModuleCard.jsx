import { ActionButton } from '@/shared/components/ui/actionIcons';

function ModuleCard({ module, onEdit, onDelete }) {
  const statusColors = {
    Draft: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-neutral-300',
    'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <div className="module-card border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-2 bg-white dark:bg-neutral-800 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">{module.title}</h4>
            {module.status && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[module.status] || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'}`}>
                {module.status}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
            {module.content?.replace(/<[^>]*>/g, '') || 'No content'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-400">Sort: {module.sort_order}</span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <ActionButton action="Edit" label="Edit module" onClick={() => onEdit(module)} />
          <ActionButton action="Delete" label="Delete module" onClick={() => onDelete(module.id)} />
        </div>
      </div>
    </div>
  );
}

export default ModuleCard;
