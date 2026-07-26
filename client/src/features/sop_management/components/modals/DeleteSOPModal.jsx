import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function DeleteSOPModal({ open, onClose, onDelete, saving }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  const handleDelete = async () => {
    await onDelete();
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Delete SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Permanent deletion warning</p>
              <p className="mt-1 text-sm text-destructive">
                This action cannot be undone. The SOP and all associated versions, sections, steps, assignments, and acknowledgements will be permanently removed.
              </p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-[var(--border)] text-destructive focus:ring-destructive"
          />
          I understand that this will permanently delete this SOP and all related data.
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!confirmed || saving}>
            {saving ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </div>
      </div>
    </div>
  );
}