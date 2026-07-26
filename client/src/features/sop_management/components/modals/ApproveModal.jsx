import { useState } from 'react';
import { X } from 'lucide-react';

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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Approve SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Confirm your approval for this SOP. You may add optional comments.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comments (optional)</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Add any relevant notes or feedback…"
          />
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleApprove} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

