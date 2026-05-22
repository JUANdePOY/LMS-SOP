import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'General', label: 'General' },
  { value: 'Training', label: 'Training' },
  { value: 'Deployment', label: 'Deployment' },
  { value: 'Administrative', label: 'Administrative' },
  { value: 'Emergency', label: 'Emergency' },
];

const priorityOptions = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function AnnouncementFilters({
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
  onClearFilters,
  resultCount,
  totalCount,
}) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(debouncedSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedSearch, setSearchTerm]);

  const hasActiveFilters = searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg",
              "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100",
              "focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            )}
          />
          {debouncedSearch && (
            <button
              onClick={() => setDebouncedSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={cn(
            "px-3 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg",
            "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100",
            "focus:ring-2 focus:ring-blue-500"
          )}
        >
          {typeOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className={cn(
            "px-3 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg",
            "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100",
            "focus:ring-2 focus:ring-blue-500"
          )}
        >
          {priorityOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(
            "px-3 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg",
            "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100",
            "focus:ring-2 focus:ring-blue-500"
          )}
        >
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className={cn(
              "px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100",
              "dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-lg transition-colors",
              "border border-neutral-300 dark:border-neutral-700"
            )}
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Showing {resultCount} of {totalCount} announcements
      </p>
    </div>
  );
}