import { RefreshCw, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UpdateNotificationBanner({
  open = false,
  message = "New changes are available on this page.",
  onRefresh,
  onDismiss,
  loading = false,
  className,
}) {
  if (!open) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "relative overflow-hidden rounded-xl border border-red-200/80 dark:border-red-500/40",
        "bg-gradient-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-950/40 dark:via-red-900/20 dark:to-red-950/40",
        "px-4 py-3 sm:px-5 sm:py-3.5",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.12),transparent_60%)]" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
          <AlertCircle size={16} />
        </div>
        <p className="flex-1 min-w-0 text-xs font-medium text-red-800 dark:text-red-200 truncate">
          {message}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              Refresh
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/15 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/50"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
