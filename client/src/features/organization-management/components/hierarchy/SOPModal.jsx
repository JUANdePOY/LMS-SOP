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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl">
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

        <div className="max-h-[28rem] overflow-y-auto px-5 py-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sops.map((sop) => {
                const href = sop.file_url || sop.url || null;
                return (
                  <button
                    key={sop.id}
                    type="button"
                    onClick={() => href && window.open(href, '_blank', 'noopener')}
                    className={`flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] p-4 text-left transition-colors ${
                      href ? 'hover:border-blue-300 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                        {sop.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {sop.version && (
                        <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                          v{sop.version}
                        </span>
                      )}
                      {sop.updated_at && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Updated {new Date(sop.updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}