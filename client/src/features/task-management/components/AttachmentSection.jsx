import { useState, useEffect, memo } from 'react';
import { Paperclip, Trash2, Eye, FileText, Image as ImageIcon, FileSpreadsheet, Archive, X } from 'lucide-react';

function isImage(mimeType) {
  return Boolean(mimeType) && mimeType.startsWith('image/');
}

const AttachmentSection = memo(function AttachmentSection({ attachments, onDelete, canManage }) {
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    if (!viewing) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setViewing(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewing]);

  const getFileIcon = (mimeType) => {
    if (!mimeType) return Paperclip;
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return FileSpreadsheet;
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return Archive;
    return Paperclip;
  };

  const getIconStyle = (mimeType) => {
    if (!mimeType) return 'bg-[var(--bg-hover)] text-[var(--text-muted)]';
    if (mimeType.startsWith('image/')) return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300';
    if (mimeType === 'application/pdf') return 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
      return 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300';
    }
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300';
    return 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300';
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-hover)]">
          <Paperclip size={18} className="text-[var(--text-muted)] opacity-70" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">No attachments yet.</p>
        <p className="text-xs text-[var(--text-muted)] opacity-70 mt-0.5">Files you upload will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((att) => {
        const Icon = getFileIcon(att.mime_type);
        return (
          <div
            key={att.id}
            className="group flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 transition-colors hover:border-[var(--text-muted)]/30 hover:bg-[var(--bg-hover)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getIconStyle(att.mime_type)}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{att.original_name || att.file_name}</p>
                <p className="text-xs text-[var(--text-muted)]">{att.mime_type} · {(att.size_bytes / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-70 transition-opacity group-hover:opacity-100">
              {att.view_url && (
                isImage(att.mime_type) ? (
                  <button
                    type="button"
                    onClick={() => setViewing(att.view_url)}
                    className="p-1.5 rounded-md hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Preview image"
                  >
                    <Eye size={14} />
                  </button>
                ) : (
                  <a
                    href={att.view_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="View attachment"
                  >
                    <Eye size={14} />
                  </a>
                )
              )}
              {canManage && (
                <button
                  onClick={() => onDelete?.(att.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/15 text-red-500 hover:text-red-600 transition-colors"
                  aria-label="Delete attachment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <button
            type="button"
            onClick={() => setViewing(null)}
            className="absolute top-3 right-3 z-20 rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
            aria-label="Close preview"
          >
            <X size={16} />
          </button>
          <img src={viewing} alt="Preview" className="relative z-10 max-h-[80vh] max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
});

export default AttachmentSection;