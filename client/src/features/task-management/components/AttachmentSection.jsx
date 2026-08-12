import { useState, memo } from 'react';
import { Paperclip, Trash2, Download, Eye } from 'lucide-react';

const AttachmentSection = memo(function AttachmentSection({ attachments, onDelete, canManage }) {
  const [viewing, setViewing] = useState(null);

  const getFileIcon = (mimeType) => {
    if (!mimeType) return Paperclip;
    if (mimeType.startsWith('image/')) return Eye;
    if (mimeType === 'application/pdf') return Download;
    return Paperclip;
  };

  if (!attachments || attachments.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No attachments yet.</p>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((att) => {
        const Icon = getFileIcon(att.mime_type);
        return (
          <div key={att.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={16} className="text-[var(--text-muted)] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-[var(--text-primary)] truncate">{att.original_name || att.file_name}</p>
                <p className="text-xs text-[var(--text-muted)]">{att.mime_type} • {(att.size_bytes / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {att.view_url && (
                <a href={att.view_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                  <Eye size={14} />
                </a>
              )}
              {canManage && (
                <button onClick={() => onDelete?.(att.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="fixed inset-0 bg-black/60" />
          <img src={viewing} alt="Preview" className="relative z-10 max-h-[80vh] max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
});

export default AttachmentSection;
