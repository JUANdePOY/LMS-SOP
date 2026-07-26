import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function SOPPublishForm({ onPublish, onCancel, saving, validationErrors }) {
  const [confirmed, setConfirmed] = useState(false);

  const handlePublish = () => {
    onPublish();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">Confirm Publish</h4>
            <p className="mt-1 text-sm text-amber-700">
              Publishing will make this SOP available to all assigned users.
              Acknowledgements will be generated for all assigned personnel.
              This action cannot be undone without creating a new version.
            </p>
          </div>
        </div>
      </div>

      {validationErrors && validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
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
        I understand that publishing will create acknowledgements for all assigned users.
      </label>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handlePublish}
          disabled={!confirmed || saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Publishing…' : 'Publish SOP'}
        </button>
      </div>
    </div>
  );
}

