import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import OrganizationTree from '../components/hierarchy/OrganizationTree';
import { useHierarchy } from '../hooks/useHierarchy';
import { sanitizeSearchQuery, validateSearchQuery } from '../utils/validation';

export default function HierarchyOverviewPage() {
  const navigate = useNavigate();
  const { hierarchy, loading, error, refresh } = useHierarchy();
  const [searchQuery, setSearchQuery] = useState('');

  const safeQuery = sanitizeSearchQuery(searchQuery);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    const err = validateSearchQuery(value);
    if (err) return;
    setSearchQuery(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Visual overview of your business structure and departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/admin/organization/businesses')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Manage Businesses
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-sm text-[var(--text-muted)] flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading organization hierarchy...
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search businesses or departments..."
                maxLength={100}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] py-2 px-3 pl-9 text-sm text-[var(--text-primary)] outline-none"
              />
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <OrganizationTree
            hierarchy={hierarchy}
            searchQuery={safeQuery}
          />
        </>
      )}
    </div>
  );
}