import { Search, RotateCcw, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

const selectClass =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed';

const statusLabels = {
  draft: 'Draft',
  published: 'Published',
  open: 'Open',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

const activityTypeLabels = {
  physical: 'Physical',
  classroom: 'Classroom',
  field: 'Field',
  simulation: 'Simulation',
};

const sourceLabels = {
  internal: 'Internal',
  external: 'External',
};

function ActiveFilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
      >
        <X size={12} />
      </button>
    </span>
  );
}

const TrainingFilters = ({ filters, onChange, onReset, sortAsc, onSortToggle }) => {
  const activityTypeDisabled = filters.source === 'external';

  const patch = (updates) => onChange({ ...filters, ...updates });

  const activeFilters = [];

  if (filters.status !== 'all') {
    activeFilters.push({
      key: 'status',
      label: `Status: ${statusLabels[filters.status] || filters.status}`,
      remove: () => patch({ status: 'all' }),
    });
  }

  if (filters.activityType !== 'all') {
    activeFilters.push({
      key: 'activityType',
      label: `Type: ${activityTypeLabels[filters.activityType] || filters.activityType}`,
      remove: () => patch({ activityType: 'all' }),
    });
  }

  if (filters.source !== 'all') {
    activeFilters.push({
      key: 'source',
      label: `Source: ${sourceLabels[filters.source] || filters.source}`,
      remove: () => patch({ source: 'all' }),
    });
  }

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal size={14} className="text-neutral-400" />
        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Filters</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

        {onSortToggle && (
          <button
            type="button"
            onClick={onSortToggle}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap"
          >
            <ArrowUpDown size={13} />
            {sortAsc ? 'Oldest first' : 'Newest first'}
          </button>
        )}
      </div>

      {filters.source === 'all' &&
        filters.status !== 'all' &&
        ['open', 'closed', 'published', 'ongoing', 'cancelled'].includes(filters.status) && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            With &quot;All Sources&quot;, status filters apply per source — rows from the other source may still appear without that status.
          </p>
        )}

      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Active:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((f) => (
                <ActiveFilterChip key={f.key} label={f.label} onRemove={f.remove} />
              ))}
            </div>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-auto"
            >
              <RotateCcw size={12} />
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingFilters;
