import { useState } from 'react';
import { X, Archive } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function ArchiveModal({ open, onClose, onArchive, saving }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  const handleArchive = async () => {
    await onArchive();
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Archive SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-4">
          <div className="flex items-start gap-3">
            <Archive className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Are you sure?</p>
              <p className="mt-1 text-sm text-destructive">
                Archiving this SOP will mark it as inactive. It will no longer be available for new assignments,
                but existing acknowledgements and history will be preserved.
              </p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-[var(--border)] text-primary focus:ring-ring"
          />
          I understand and want to archive this SOP.
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleArchive} disabled={!confirmed || saving}>
            {saving ? 'Archiving…' : 'Archive'}
          </Button>
        </div>
      </div>
    </div>
  );
}