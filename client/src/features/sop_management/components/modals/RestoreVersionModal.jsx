import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function RestoreVersionModal({ open, onClose, onRestore, version, saving }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open || !version) return null;

  const handleRestore = async () => {
    await onRestore(version.id);
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Restore Version</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 p-4 mb-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="h-5 w-5 text-[var(--accent-gold)] mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--accent-gold)]">
                Restore v{version.version || '1.0'}?
              </p>
              <p className="mt-1 text-sm text-[var(--accent-gold)]">
                This will create a new draft version based on v{version.version || '1.0'}.
                The existing versions will not be modified.
              </p>
            </div>
          </div>
        </div>

        {version.change_summary && (
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Change Summary</p>
            <p className="mt-1 text-sm text-foreground">{version.change_summary}</p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-[var(--border)] text-primary focus:ring-ring"
          />
          I understand this will create a new draft version.
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleRestore} disabled={!confirmed || saving}>
            {saving ? 'Restoring…' : 'Restore Version'}
          </Button>
        </div>
      </div>
    </div>
  );
}