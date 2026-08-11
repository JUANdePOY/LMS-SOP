import { FileText, FileImage, FileSpreadsheet, File as FileIcon, ExternalLink, Trash2, AlertTriangle } from "lucide-react";

const ACCEPTED = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv"];
const MAX_SIZE_MB = 25;

export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv";
export const DOCUMENT_MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function isAcceptedDocument(name = "") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ACCEPTED.includes(ext);
}

export function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function iconFor(name = "") {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return FileImage;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  return FileText;
}

/**
 * Attachment card for a document lesson.
 * Surfaces the file name, type, size, and an open/remove affordance so the
 * author can confirm what learners will receive before saving.
 */
export default function DocumentPreview({ file, url, onOpen, onRemove }) {
  if (!file && !url) {
    return (
      <div className="flex aspect-[2.4/1] w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center">
        <div className="space-y-2 px-4">
          <FileIcon size={28} className="mx-auto text-neutral-300" />
          <p className="text-sm text-neutral-500">Upload a document to preview it here</p>
        </div>
      </div>
    );
  }

  const Icon = file ? iconFor(file.name) : FileText;
  const name = file?.name || url?.split("/").pop() || "Document";
  const size = file?.size;
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";
  const tooLarge = size && size > DOCUMENT_MAX_BYTES;

  // Open: prefer a saved URL (server path), otherwise the in-memory data URL.
  const openTarget = url || (file ? URL.createObjectURL(file) : null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[rgba(242,92,5,0.08)] text-[var(--color-primary)]">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              {ext}
            </span>
            {size ? <span>{formatBytes(size)}</span> : null}
            <span>Document lesson</span>
          </p>
        </div>
        {openTarget && (
          <a
            href={openTarget}
            target="_blank"
            rel="noreferrer noopener"
            title="Open document"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            <ExternalLink size={13} /> Open
          </a>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove document"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>

      {tooLarge && (
        <div className="flex items-start gap-2 rounded-md border border-[rgba(217,163,0,0.25)] bg-warning-soft px-3 py-2 text-xs text-[var(--color-warning)] dark:border-amber-800 dark:bg-amber-950/20 dark:text-[var(--color-warning)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>This file exceeds the {MAX_SIZE_MB} MB limit and may fail to upload. Consider compressing it.</span>
        </div>
      )}
    </div>
  );
}
