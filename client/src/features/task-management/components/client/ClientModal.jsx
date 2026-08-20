import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

function ClientModal({ open, onClose, onSubmit, initialData, loading }) {
  const [clientName, setClientName] = useState('');
  const [businesses, setBusinesses] = useState(['']);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setClientName(initialData?.client_name || '');
      const existing = initialData?.businesses?.map((b) => b.business_name) || [];
      setBusinesses(existing.length > 0 ? existing : ['']);
      setErrors({});
    }
  }, [open, initialData]);

  if (!open) return null;

  const updateBusiness = (index, value) => {
    setBusinesses((prev) => prev.map((b, i) => (i === index ? value : b)));
  };

  const addBusiness = () => setBusinesses((prev) => [...prev, '']);
  const removeBusiness = (index) =>
    setBusinesses((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)));

  const handleSubmit = () => {
    const nextErrors = {};
    if (!clientName.trim()) nextErrors.client_name = 'Client name is required';

    const cleaned = businesses.map((b) => b.trim()).filter(Boolean);
    const lower = cleaned.map((b) => b.toLowerCase());
    const dupes = lower.filter((b, i) => lower.indexOf(b) !== i);
    if (dupes.length > 0) {
      nextErrors.businesses = `Duplicate business name: ${[...new Set(dupes)].join(', ')}`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ client_name: clientName.trim(), businesses: cleaned });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm max-h-[92vh] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {initialData ? 'Edit Client' : 'New Client'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Client Name *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name"
              maxLength={255}
              className={`w-full rounded-lg border bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)] ${errors.client_name ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {errors.client_name && (
              <p className="text-xs text-red-500 mt-1">{errors.client_name}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Client Businesses
              </label>
              <button
                type="button"
                onClick={addBusiness}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Business
              </button>
            </div>
            <div className="space-y-2">
              {businesses.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={b}
                    onChange={(e) => updateBusiness(idx, e.target.value)}
                    placeholder="Business name"
                    maxLength={255}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeBusiness(idx)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                    aria-label="Remove business"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            {errors.businesses && (
              <p className="text-xs text-red-500 mt-1">{errors.businesses}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 sm:px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientModal;
