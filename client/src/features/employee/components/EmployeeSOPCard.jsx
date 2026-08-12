import { useCallback } from "react";
import { FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  Draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
  "In Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "For Review": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Archived: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Draft;
  if (!status) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border border-transparent ${style}`}>
      {status}
    </span>
  );
}

export default function EmployeeSOPCard({ sop, viewMode, onClick }) {
  const handleClick = useCallback(() => {
    onClick?.(sop.id);
  }, [onClick, sop.id]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  if (viewMode === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={sop.title ? `Open SOP ${sop.title}` : "Open SOP"}
        className="group flex cursor-pointer items-center gap-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 hover:shadow-md hover:border-[rgba(242,92,5,0.25)] dark:hover:border-blue-800 transition-all duration-200"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
          <FileText size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-[var(--color-primary-hover)] dark:group-hover:text-[var(--color-primary)] transition-colors">
              {sop.title || "Untitled SOP"}
            </h3>
            <StatusBadge status={sop.status} />
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            {sop.code && (
              <span className="font-mono">{sop.code}</span>
            )}
            {sop.department_name && (
              <span className="truncate">{sop.department_name}</span>
            )}
            {sop.category_name && (
              <span className="truncate">• {sop.category_name}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={sop.title ? `Open SOP ${sop.title}` : "Open SOP"}
      className="group flex cursor-pointer flex-col rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md hover:border-[rgba(242,92,5,0.25)] dark:hover:border-blue-800 transition-all duration-200 overflow-hidden"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
        <div className="flex items-center justify-center">
          <FileText size={36} className="text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          {sop.category_name && (
            <span className="inline-flex items-center rounded-lg bg-white/90 dark:bg-neutral-900/80 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              {sop.category_name}
            </span>
          )}
          <StatusBadge status={sop.status} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-full bg-white dark:bg-neutral-800 p-2.5 shadow-lg">
            <BookOpen size={22} className="text-neutral-600 dark:text-neutral-300" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <h3 className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2 group-hover:text-[var(--color-primary-hover)] dark:group-hover:text-[var(--color-primary)] transition-colors">
            {sop.title || "Untitled SOP"}
          </h3>
          {sop.description && (
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-1">
              {sop.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          {sop.code && (
            <span className="font-mono">{sop.code}</span>
          )}
          {sop.department_name && (
            <span className="truncate">{sop.department_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}
