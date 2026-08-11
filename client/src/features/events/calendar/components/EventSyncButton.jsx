import { useState } from "react";
import { CalendarPlus, Check, Loader2, Trash2, AlertCircle } from "lucide-react";

export default function EventSyncButton({ eventId, calendar, onOpenManage, onSynced, onUnsynced }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const state = calendar.syncingIds[eventId];

  const handleSync = async () => {
    setMenuOpen(false);
    try {
      await calendar.syncEvent(eventId);
      onSynced && onSynced();
    } catch {
      // surfaced via state badge; no throw needed for UI
    }
  };

  const handleUnsync = async () => {
    setMenuOpen(false);
    try {
      await calendar.unsyncEvent(eventId);
      onUnsynced && onUnsynced();
    } catch {
      /* no-op */
    }
  };

  if (!calendar.status.connected) {
    return (
      <button
        type="button"
        title="Connect Google Calendar to sync"
        onClick={() => onOpenManage && onOpenManage()}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
      >
        <CalendarPlus size={14} />
        Sync
      </button>
    );
  }

  if (state === "syncing") {
    return (
      <span
        title="Syncing to Google Calendar…"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400"
      >
        <Loader2 size={14} className="animate-spin" />
        Syncing…
      </span>
    );
  }

  if (state === "error") {
    return (
      <button
        type="button"
        title="Sync failed — click to retry"
        onClick={handleSync}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
      >
        <AlertCircle size={14} />
        Retry
      </button>
    );
  }

  if (state === "synced") {
    return (
      <div className="relative">
        <button
          type="button"
          title="Synced to Google Calendar — click to manage"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-success)] bg-[var(--color-success)]/10 hover:bg-[var(--color-success)]/15 transition-colors"
        >
          <Check size={14} />
          Synced
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-lg">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              In your Google Calendar
            </div>
            <button
              onClick={handleUnsync}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Trash2 size={13} />
              Remove from calendar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      title="Add to Google Calendar"
      onClick={handleSync}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
    >
      <CalendarPlus size={14} />
      Add to calendar
    </button>
  );
}
