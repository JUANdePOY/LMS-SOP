function VersionTimeline({ versions, onRestore, loading = false, restoring = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="border-l-2 border-neutral-200 dark:border-neutral-700 pl-3 py-1 animate-pulse">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return <p className="text-neutral-500 dark:text-neutral-400 text-sm">No versions yet.</p>;
  }

  return (
    <div className="version-timeline">
      <div className="space-y-4">
        {versions.map((version) => (
          <div key={version.id} className="relative border-l-2 border-neutral-200 dark:border-neutral-700 pl-4 pb-4">
            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">v{version.version}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                  version.status === 'Published' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  version.status === 'Draft' ? 'bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-neutral-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {version.status}
                </span>
              </div>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {new Date(version.created_at).toLocaleDateString()}
              </span>
            </div>
            {version.change_summary && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{version.change_summary}</p>
            )}
            {version.status !== 'Published' && (
              <button
                onClick={() => onRestore(version.id)}
                disabled={restoring}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
              >
                {restoring ? 'Restoring...' : 'Restore this version'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VersionTimeline;
