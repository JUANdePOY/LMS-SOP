import { CheckCircle2, Loader2, CalendarCheck } from "lucide-react";

/**
 * Shows the per-event Google Calendar sync summary. `phase`:
 *   - "pending"   : connected, waiting for user to pick events to sync
 *   - "syncing"   : an event is being pushed to Google Calendar
 *   - "done"      : initial/steady state after connect
 *   - "unavailable": calendar not connected
 */
export default function CalendarSyncSummary({ phase, totalEvents, syncedCount }) {
  if (phase === "unavailable") return null;

  if (phase === "syncing") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Syncing to Google Calendar…
          </p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const allSynced = syncedCount > 0 && syncedCount === totalEvents;
    return (
      <div
        className={`flex items-start gap-3 rounded-xl border p-3 ${
          allSynced
            ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10"
            : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            allSynced
              ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
          }`}
        >
          {allSynced ? <CheckCircle2 size={18} /> : <CalendarCheck size={18} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            {syncedCount} of {totalEvents} event{totalEvents === 1 ? "" : "s"} synced to Google Calendar
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Use "Add to calendar" on individual events to choose which ones appear in your Google Calendar.
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
          Select events to sync from your event list. Nothing is added to Google Calendar until you choose.
        </p>
      </div>
    </div>
  );
}
