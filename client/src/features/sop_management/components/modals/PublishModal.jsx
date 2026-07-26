import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

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
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Publish SOP</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                Publishing will make this SOP available to all assigned users and generate acknowledgements.
                A new version snapshot will be created.
              </p>
            </div>
          </div>
        </div>

        {validationErrors && validationErrors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4">
            <ul className="list-disc pl-4 text-sm text-red-700 space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</li>
              ))}
            </ul>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          I understand that this will create a new published version and generate acknowledgement records.
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handlePublish} disabled={!confirmed || saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

