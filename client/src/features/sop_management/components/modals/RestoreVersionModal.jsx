import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

export default function RestoreVersionModal({ open, onClose, onRestore, version, saving }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open || !version) return null;

  const handleRestore = async () => {
    await onRestore(version.id);
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Restore Version</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Restore v{version.version || '1.0'}?
              </p>
              <p className="mt-1 text-sm text-amber-700">
                This will create a new draft version based on v{version.version || '1.0'}.
                The existing versions will not be modified.
              </p>
            </div>
          </div>
        </div>

        {version.change_summary && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Change Summary</p>
            <p className="mt-1 text-sm text-gray-700">{version.change_summary}</p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          I understand this will create a new draft version.
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleRestore} disabled={!confirmed || saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Restoring…' : 'Restore Version'}
          </button>
        </div>
      </div>
    </div>
  );
}

