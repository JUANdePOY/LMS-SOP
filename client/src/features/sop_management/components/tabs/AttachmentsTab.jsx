import { useRef, useState } from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
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
    return <div className="text-sm text-[var(--text-muted)] py-4">Loading attachments…</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
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
          <Button variant="default" asChild disabled={saving}>
            <label htmlFor="attachment-upload" className="cursor-pointer">
              <Upload className="h-4 w-4" />
              {saving ? 'Uploading…' : 'Upload'}
            </label>
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {uploadError}
        </div>
      )}

      {!attachments || attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
          No attachments yet. Upload a file to attach it to this SOP.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-subtle)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="w-16 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {attachments.map((attachment) => (
                <tr key={attachment.id} className="hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    {attachment.original_name || attachment.filename}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)] uppercase">
                      {attachment.mime_type || attachment.document_type || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {attachment.created_at ? new Date(attachment.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => remove(attachment.id)} disabled={saving} title="Delete attachment">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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