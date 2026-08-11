import { useState, useEffect } from "react";
import { Calendar, Check, Loader2, Unlink, AlertCircle } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { getCalendarStatus } from "../api/calendar.api";
import CalendarSyncSummary from "./CalendarSyncSummary";

export default function GoogleCalendarModal({ open, onClose, calendar, onConnect, onDisconnect, onConnectStart, eventsCount = 0, syncPhase = "unavailable", syncedCount = 0, failedCount = 0 }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { status, connect, disconnect } = calendar;

  // The connect() promise can occasionally lag (slow Google API / bulk sync).
  // Once the backend reports connected, stop the button spinner immediately so
  // the UI never appears stuck even if the promise hasn't resolved yet.
  useEffect(() => {
    if (status.connected) setBusy(false);
  }, [status.connected]);

  const handleConnect = async () => {
    if (busy || status.connected) return;
    setBusy(true);
    setError(null);
    onConnectStart && onConnectStart();

    let connectError = null;
    try {
      await connect();
    } catch (err) {
      connectError = err;
    }

    let verified = false;
    try {
      const MAX_CHECKS = 6;
      const DELAY_MS = 500;
      for (let i = 0; i < MAX_CHECKS; i++) {
        try {
          const statusRes = await getCalendarStatus(true);
          if (statusRes.data?.success && statusRes.data.data?.connected) {
            verified = true;
            break;
          }
        } catch (e) {
          // ignore transient network errors and continue retrying
        }
        await new Promise((res) => setTimeout(res, DELAY_MS));
      }
    } catch (e) {
      // fall through to show the error message below
    }

    if (verified) {
      onConnect && onConnect();
    } else {
      const code = connectError?.response?.data?.code;
      if (code === "CALENDAR_DISABLED") {
        setError("Google Calendar isn't enabled on this server. Ask an admin to configure the Google OAuth credentials.");
      } else {
        setError(connectError?.message || "Failed to connect Google Calendar");
      }
    }
    setBusy(false);
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnect();
      onDisconnect && onDisconnect();
    } catch (err) {
      setError(err.message || "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        disabled={busy}
        className="rounded-lg px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
      >
        Close
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Google Calendar" footer={footer}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
            <Calendar size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Sync LMS events to your calendar
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Connect your Google account to add events to your personal Google Calendar.
              LMS events are the source of truth; updates here sync automatically.
            </p>
          </div>
        </div>

        {status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-success-soft px-3 py-2">
              <Check size={14} className="text-[var(--color-success)]" />
              <span className="text-xs text-neutral-700 dark:text-neutral-200">
                Connected as <span className="font-semibold">{status.googleEmail}</span>
              </span>
            </div>
            <CalendarSyncSummary
              phase={syncPhase}
              totalEvents={eventsCount}
              syncedCount={syncedCount}
              failedCount={failedCount}
            />
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
              Remove integration
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg btn-primary px-3 py-2 text-xs font-medium text-white hover-brand disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
            Connect Google Calendar
          </button>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2">
            <AlertCircle size={14} className="text-red-600" />
            <span className="text-xs text-red-600 dark:text-red-300">{error}</span>
          </div>
        )}

        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
          We store your Google tokens encrypted. Revoking access from your Google account also disconnects this integration.
        </p>
      </div>
    </Modal>
  );
}
