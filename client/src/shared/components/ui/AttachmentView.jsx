import { useState } from "react";
import { Paperclip, Download } from "lucide-react";
import { downloadAttachment } from "@/shared/utils/downloadFile";
import { useToast } from "@/shared/components/ui/Toast";

// Renders message/comment attachments with a reliable download action.
// `variant` adapts the neutral (non-own) styling to the surrounding surface,
// while `isOwn` switches to the light-on-colored bubble style used by both
// chat and task-comment threads.
export default function AttachmentView({ attachments = [], isOwn = false, variant = "chat" }) {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState(null);

  const list = Array.isArray(attachments) ? attachments : [];
  if (list.length === 0) return null;

  const handleDownload = async (att) => {
    const fileName = att.original_name || att.file_name || "download";
    setDownloadingId(att.id);
    try {
      await downloadAttachment(att.view_url, fileName);
    } catch {
      toast.error("Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  const ownClass = "border-white/30 bg-white/10 text-white hover:bg-white/20";
  const neutralClass =
    variant === "chat"
      ? "border-neutral-200 dark:border-neutral-700 text-[var(--color-primary)] hover:bg-neutral-100 dark:hover:bg-neutral-700"
      : "border-[var(--border)] text-[var(--color-primary)] hover:bg-[var(--bg-hover)]";

  return (
    <div className="mt-2 space-y-2">
      {list.map((att) => {
        const isImage = att.mime_type && att.mime_type.startsWith("image/");
        const fileName = att.original_name || att.file_name;

        if (isImage) {
          return (
            <div key={att.id} className="relative inline-block overflow-hidden rounded-lg border border-black/10">
              <a href={att.view_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={att.view_url}
                  alt={fileName}
                  className="max-h-56 w-auto max-w-full object-cover"
                  loading="lazy"
                />
              </a>
              <button
                type="button"
                onClick={() => handleDownload(att)}
                disabled={downloadingId === att.id}
                aria-label="Download image"
                className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1.5 text-white transition-colors hover:bg-black/70 disabled:opacity-60"
              >
                <Download size={13} className={downloadingId === att.id ? "animate-pulse" : ""} />
              </button>
            </div>
          );
        }

        return (
          <button
            key={att.id}
            type="button"
            onClick={() => handleDownload(att)}
            disabled={downloadingId === att.id}
            className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-left ${isOwn ? ownClass : neutralClass}`}
          >
            <Paperclip size={13} className="shrink-0" />
            <span className="truncate flex-1">{fileName}</span>
            <Download size={12} className={`shrink-0 opacity-70 ${downloadingId === att.id ? "animate-pulse" : ""}`} />
          </button>
        );
      })}
    </div>
  );
}
