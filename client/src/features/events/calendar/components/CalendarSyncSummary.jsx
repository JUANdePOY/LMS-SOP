import { CheckCircle2, Loader2, CalendarCheck, AlertCircle } from "lucide-react";

/**
 * Shows the result of the initial bulk sync that runs right after a user
 * connects their Google Calendar. `phase`:
 *   - "pending"   : connected, bulk sync not yet observed
 *   - "syncing"   : events are being pushed
 *   - "done"      : bulk sync finished (syncedCount known)
 *   - "unavailable": calendar not connected
 */
export default function CalendarSyncSummary({ phase, totalEvents, syncedCount, failedCount = 0 }) {
  if (phase === "unavailable") return null;

  if (phase === "syncing") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Adding your events…
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Pushing {totalEvents} LMS event{totalEvents === 1 ? "" : "s"} to your Google Calendar.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const allSynced = failedCount === 0;
    return (
      <div
        className={`flex items-start gap-3 rounded-xl border p-3 ${
          allSynced
            ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10"
            : "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            allSynced
              ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
              : "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300"
          }`}
        >
          {allSynced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            <CalendarCheck size={14} className={allSynced ? "text-[var(--color-success)]" : "text-amber-600"} />
            {allSynced
              ? `All ${syncedCount} event${syncedCount === 1 ? "" : "s"} added to Google Calendar`
              : `${syncedCount} of ${totalEvents} event${totalEvents === 1 ? "" : "s"} added`}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {allSynced
              ? "Your schedule is now mirrored in Google Calendar. New or edited events sync automatically."
              : `${failedCount} event${failedCount === 1 ? "" : "s"} could not be added. You can retry individually from the event card.`}
          </p>
        </div>
      </div>
    );
  }

  // phase === "pending"
  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <CalendarCheck size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Connected
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Syncing your {totalEvents} event{totalEvents === 1 ? "" : "s"} to Google Calendar…
        </p>
      </div>
    </div>
  );
}
