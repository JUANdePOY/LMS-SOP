import { useState } from 'react';
import { X, Archive } from 'lucide-react';

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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Archive SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4">
          <div className="flex items-start gap-3">
            <Archive className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Are you sure?</p>
              <p className="mt-1 text-sm text-red-700">
                Archiving this SOP will mark it as inactive. It will no longer be available for new assignments,
                but existing acknowledgements and history will be preserved.
              </p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          I understand and want to archive this SOP.
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleArchive} disabled={!confirmed || saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}

