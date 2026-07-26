import { useState } from 'react';
import { X, Share2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const SHARE_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
];

const PERMISSIONS = [
  { value: 'view', label: 'View' },
  { value: 'edit', label: 'Edit' },
];

export default function ShareSOPModal({ open, onClose, onShare, sop, saving }) {
  const [shareType, setShareType] = useState('internal');
  const [shareWith, setShareWith] = useState('');
  const [permissions, setPermissions] = useState('view');
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!shareWith.trim()) {
      setError('Please enter who to share with');
      return;
    }
    setError(null);
    try {
      await onShare(sop?.id, { share_type: shareType, share_with: shareWith.trim(), permissions });
      setShareWith('');
      setPermissions('view');
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to share SOP');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Share SOP</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sop && (
          <p className="text-sm text-muted-foreground mb-4">
            Sharing: <span className="font-medium">{sop.title || sop.code || 'Untitled'}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Share type</label>
            <select
              value={shareType}
              onChange={(e) => setShareType(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-ring"
            >
              {SHARE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Share with</label>
            <input
              value={shareWith}
              onChange={(e) => setShareWith(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-ring"
              placeholder="Email, group, or user ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Permissions</label>
            <select
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-ring"
            >
              {PERMISSIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? 'Sharing…' : 'Create Share'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}