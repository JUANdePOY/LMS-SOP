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
    } catch (err) {
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
        className="p-1.5 rounded-md text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <CalendarPlus size={14} />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        title={state === "synced" ? "Synced to Google Calendar" : "Sync to Google Calendar"}
        onClick={() => (state === "synced" ? setMenuOpen((v) => !v) : handleSync())}
        className={`p-1.5 rounded-md ${
          state === "synced"
            ? "text-[var(--color-success)]"
            : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
      >
        {state === "syncing" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : state === "synced" ? (
          <Check size={14} />
        ) : state === "error" ? (
          <AlertCircle size={14} className="text-red-500" />
        ) : (
          <CalendarPlus size={14} />
        )}
      </button>

      {menuOpen && state === "synced" && (
        <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-lg">
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
