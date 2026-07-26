import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function ApproveModal({ open, onClose, onApprove, saving }) {
  const [comments, setComments] = useState('');

  if (!open) return null;

  const handleApprove = async () => {
    await onApprove(comments);
    setComments('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Approve SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Confirm your approval for this SOP. You may add optional comments.
        </p>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Comments (optional)</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-ring"
            placeholder="Add any relevant notes or feedback…"
          />
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleApprove} disabled={saving}>
            {saving ? 'Approving…' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  );
}