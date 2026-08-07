import { FileText, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";

const STATUS_STYLES = {
  published: "bg-emerald-50 text-emerald-600",
  draft: "bg-amber-50 text-amber-600",
  archived: "bg-neutral-100 text-neutral-600",
};

function statusLabel(status) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

/**
 * Live preview card for an embedded SOP lesson.
 * Surfaces the SOP code, title, status, ownership context, and a link to open it.
 */
export default function SopPreview({ sop, onOpen }) {
  if (!sop) {
    return (
      <div className="flex aspect-[2.4/1] w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center">
        <div className="space-y-2 px-4">
          <FileText size={28} className="mx-auto text-neutral-300" />
          <p className="text-sm text-neutral-500">Select an SOP to preview it here</p>
        </div>
      </div>
    );
  }

  const status = (sop.status || "draft").toLowerCase();
  const isProblematic = status !== "published";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <FileText size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {sop.code && (
                  <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                    {sop.code}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
                  {statusLabel(status)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {sop.title || "Untitled SOP"}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                {sop.category_name && <span>{sop.category_name}</span>}
                {sop.department_name && <span>{sop.department_name}</span>}
                {sop.owner_name && <span>Owner: {sop.owner_name}</span>}
                {sop.version != null && <span>v{sop.version}</span>}
              </div>
            </div>
          </div>
          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              title="Open SOP"
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <ExternalLink size={13} /> Open
            </button>
          )}
        </div>
        {sop.description && (
          <p className="mt-3 line-clamp-2 text-xs text-neutral-500">{sop.description}</p>
        )}
      </div>

      {isProblematic && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            This SOP is <span className="font-medium">{statusLabel(status).toLowerCase()}</span>. Learners may not be able to view it until it is published.
          </span>
        </div>
      )}
    </div>
  );
}

export { CheckCircle2 };
