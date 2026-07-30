import SortableModuleList from './SortableModuleList';
import ModuleToolbar from './ModuleToolbar';

function ModuleSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 animate-pulse bg-white dark:bg-neutral-800">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-1"></div>
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

function ModuleList({ modules = [], loading, error, onAdd, onEdit, onDelete, onReorder }) {
  if (loading) {
    return <ModuleSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400 text-sm">Failed to load modules</p>
        <button onClick={onReorder} className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="module-list">
      <ModuleToolbar onAdd={onAdd} onReorder={onReorder} />
      {modules.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No modules yet. Add one to get started.</p>
        </div>
      ) : (
        <SortableModuleList
          modules={modules}
          onEdit={onEdit}
          onDelete={onDelete}
          onReorder={onReorder}
        />
      )}
    </div>
  );
}

export default ModuleList;