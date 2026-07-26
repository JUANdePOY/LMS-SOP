import { FileText, Trash2, Download } from 'lucide-react';

export default function AttachmentCard({ attachment, onDelete, onDownload, disabled }) {
  if (!attachment) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
            {attachment.original_name || attachment.filename}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[var(--text-secondary)] uppercase">
              {attachment.mime_type || attachment.document_type || 'Unknown'}
            </span>
            {attachment.file_size && (
              <>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {(attachment.file_size / 1024).toFixed(1)} KB
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {onDownload && (
          <button
            type="button"
            onClick={() => onDownload(attachment.id)}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(attachment.id)}
            disabled={disabled}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
            title="Delete attachment"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}