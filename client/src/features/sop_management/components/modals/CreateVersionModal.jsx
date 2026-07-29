import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { SOP_STATUS, SOP_STATUS_LABELS } from '../../constants/sopStatus';

export default function CreateVersionModal({ open, onClose, onCreate, saving, nextVersion }) {
  const [changeSummary, setChangeSummary] = useState('');
  const [status, setStatus] = useState(SOP_STATUS.DRAFT);

  if (!open) return null;

  const handleCreate = async () => {
    await onCreate({ version: nextVersion, change_summary: changeSummary, status });
    setChangeSummary('');
    setStatus(SOP_STATUS.DRAFT);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Create New Version</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Create a new version snapshot of this SOP. The new version will be set to Draft by default.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Version</label>
            <input
              type="text"
              value={nextVersion}
              readOnly
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-foreground px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-foreground px-3 py-2 text-sm outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-ring"
            >
              {Object.values(SOP_STATUS).map((s) => (
                <option key={s} value={s}>{SOP_STATUS_LABELS[s] || s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Change Summary</label>
            <textarea
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-ring"
              placeholder="Describe what changed in this version…"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleCreate} disabled={saving || !changeSummary.trim()}>
            {saving ? 'Creating…' : 'Create Version'}
          </Button>
        </div>
      </div>
    </div>
  );
}