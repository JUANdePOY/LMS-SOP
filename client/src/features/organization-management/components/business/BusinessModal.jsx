import { useEffect } from 'react';
import { X } from 'lucide-react';
import BusinessForm from './BusinessForm';

export default function BusinessModal({ open, onClose, onSubmit, initialData, loading }) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
        onClick={() => !loading && onClose()}
      />
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl animate-[modalIn_0.18s_ease-out]"
        style={{
          animationFillMode: 'backwards',
        }}
      >
        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        `}</style>

        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 id="business-modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
            {initialData ? 'Edit business' : 'Create business'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <BusinessForm
            initialData={initialData}
            onSubmit={onSubmit}
            onCancel={onClose}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}