import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function PublishModal({ open, onClose, onPublish, saving, validationErrors }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  const handlePublish = async () => {
    await onPublish();
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Publish SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[var(--accent-gold)] mt-0.5" />
            <div>
              <p className="text-sm text-[var(--accent-gold)]">
                Publishing will make this SOP available to all assigned users and generate acknowledgements.
                A new version snapshot will be created.
              </p>
            </div>
          </div>
        </div>

        {validationErrors && validationErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 mb-4">
            <ul className="list-disc pl-4 text-sm text-destructive space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</li>
              ))}
            </ul>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-[var(--border)] text-primary focus:ring-ring"
          />
          I understand that this will create a new published version and generate acknowledgement records.
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="default" onClick={handlePublish} disabled={!confirmed || saving}>
            {saving ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}