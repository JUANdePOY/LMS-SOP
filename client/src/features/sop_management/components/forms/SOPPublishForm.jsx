import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function SOPPublishForm({ onPublish, onCancel, saving, validationErrors }) {
  const [confirmed, setConfirmed] = useState(false);

  const handlePublish = () => {
    onPublish();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-[var(--accent-gold)] mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-[var(--accent-gold)]">Confirm Publish</h4>
            <p className="mt-1 text-sm text-[var(--accent-gold)]">
              Publishing will make this SOP available to all assigned users.
              Acknowledgements will be generated for all assigned personnel.
              This action cannot be undone without creating a new version.
            </p>
          </div>
        </div>
      </div>

      {validationErrors && validationErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
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
          className="rounded border-input text-primary focus:ring-ring"
        />
        I understand that publishing will create acknowledgements for all assigned users.
      </label>

<div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button variant="default" onClick={handlePublish} disabled={!confirmed || saving}>
          {saving ? 'Publishing…' : 'Publish SOP'}
        </Button>
      </div>
    </div>
  );
}