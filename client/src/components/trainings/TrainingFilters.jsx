import { Search, RotateCcw } from 'lucide-react';

const selectClass =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed';

const TrainingFilters = ({ filters, onChange, onReset }) => {
  const activityTypeDisabled = filters.source === 'external';

  const patch = (updates) => onChange({ ...filters, ...updates });

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search trainings..."
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            aria-label="Search trainings"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => patch({ status: e.target.value })}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published (Internal)</option>
          <option value="open">Open (External)</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled (Internal)</option>
          <option value="closed">Closed (External)</option>
        </select>

        <select
          value={filters.activityType}
          onChange={(e) => patch({ activityType: e.target.value })}
          className={selectClass}
          disabled={activityTypeDisabled}
          title={activityTypeDisabled ? 'Activity type applies to internal trainings only' : undefined}
          aria-label="Filter by activity type"
        >
          <option value="all">All Activity Types</option>
          <option value="physical">Physical</option>
          <option value="classroom">Classroom</option>
          <option value="field">Field</option>
          <option value="simulation">Simulation</option>
        </select>

        <select
          value={filters.source}
          onChange={(e) => patch({ source: e.target.value })}
          className={selectClass}
          aria-label="Filter by source"
        >
          <option value="all">All Sources</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
        </select>
      </div>

      {filters.source === 'all' &&
        filters.status !== 'all' &&
        ['open', 'closed', 'published', 'ongoing', 'cancelled'].includes(filters.status) && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            With &quot;All Sources&quot;, status filters apply per source — rows from the other source may still appear without that status.
          </p>
        )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
        >
          <RotateCcw size={14} />
          Reset filters
        </button>
      </div>
    </div>
  );
};

export default TrainingFilters;
