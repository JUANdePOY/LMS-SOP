import { useEffect, useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { useHierarchyContext } from './HierarchyContext';
import { getDepartmentSops } from '../../api/hierarchy.api';

export default function SOPModal() {
  const { sopModalOpen, closeSopModal, selectedDepartment } = useHierarchyContext();
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sopModalOpen || !selectedDepartment) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getDepartmentSops(selectedDepartment.id)
      .then((response) => {
        if (cancelled) return;
        const payload = response.data?.data;
        const rows = payload?.rows ?? (Array.isArray(payload) ? payload : []);
        setSops(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || err?.message || 'Unable to load SOPs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sopModalOpen, selectedDepartment]);

  if (!sopModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">SOPs</p>
            <p className="text-xs text-[var(--text-muted)]">{selectedDepartment?.name}</p>
          </div>
          <button
            onClick={closeSopModal}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading SOPs...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && sops.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No SOPs found for this department.
            </p>
          )}

          {!loading && !error && sops.length > 0 && (
            <ul className="space-y-2">
              {sops.map((sop) => (
                <li
                  key={sop.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <FileText className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{sop.title}</p>
                    {sop.updated_at && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Updated {new Date(sop.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
