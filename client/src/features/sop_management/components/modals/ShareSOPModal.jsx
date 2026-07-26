import { useState } from 'react';
import { X, Share2 } from 'lucide-react';

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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Share SOP</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sop && (
          <p className="text-sm text-gray-600 mb-4">
            Sharing: <span className="font-medium">{sop.title || sop.code || 'Untitled'}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share type</label>
            <select
              value={shareType}
              onChange={(e) => setShareType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {SHARE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share with</label>
            <input
              value={shareWith}
              onChange={(e) => setShareWith(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Email, group, or user ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
            <select
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {PERMISSIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Sharing…' : 'Create Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

