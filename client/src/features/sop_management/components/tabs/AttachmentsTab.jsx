import { useRef, useState } from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { useAttachments } from '../../hooks/useAttachments';

export default function AttachmentsTab({ sopId }) {
  const { attachments, loading, saving, error, upload, remove } = useAttachments(sopId);
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    try {
      await upload(file);
    } catch (err) {
      setUploadError(err?.response?.data?.message || err?.message || 'Unable to upload file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading && attachments.length === 0) {
    return <div className="text-sm text-gray-500 py-4">Loading attachments…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Attachments ({attachments.length})
          </h3>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="attachment-upload"
          />
          <label
            htmlFor="attachment-upload"
            className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer ${saving ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Upload className="h-4 w-4" />
            {saving ? 'Uploading…' : 'Upload'}
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {!attachments || attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
          No attachments yet. Upload a file to attach it to this SOP.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="w-16 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attachments.map((attachment) => (
                <tr key={attachment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {attachment.original_name || attachment.filename}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
                      {attachment.mime_type || attachment.document_type || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {attachment.created_at ? new Date(attachment.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(attachment.id)}
                      disabled={saving}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Delete attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

