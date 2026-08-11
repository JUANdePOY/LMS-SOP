import { useState, useEffect, useCallback } from "react";
import {
  getCalendarStatus,
  getCalendarAuthUrl,
  syncEventToCalendar,
  unsyncEventFromCalendar,
  disconnectCalendar,
} from "../api/calendar.api";

export function useGoogleCalendar() {
  const [status, setStatus] = useState({ connected: false, googleEmail: null });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncingIds, setSyncingIds] = useState({});

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await getCalendarStatus();
      if (res.data?.success) {
        setStatus({
          connected: !!res.data.data?.connected,
          googleEmail: res.data.data?.googleEmail || null,
        });
      }
    } catch {
      setStatus({ connected: false, googleEmail: null });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const connect = useCallback(async () => {
    const res = await getCalendarAuthUrl();
    if (!res.data?.success) throw new Error(res.data?.message || "Failed to start connection");
    const url = res.data.data.url;
    return new Promise((resolve, reject) => {
      const popup = window.open(url, "google-calendar-auth", "width=520,height=640");
      if (!popup) {
        reject(new Error("Popup blocked. Please allow popups and try again."));
        return;
      }

      // Some hosting setups send Cross-Origin-Opener-Policy, which severs the
      // opener<->popup link and breaks both window.postMessage and popup.closed.
      // To stay resilient we poll our own /calendar/status endpoint instead of
      // relying on cross-window signaling. The connection is confirmed once the
      // backend reports the token as stored.
      let attempts = 0;
      const MAX_ATTEMPTS = 40; // ~60s at 1.5s intervals
      const poll = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await getCalendarStatus();
          if (statusRes.data?.success && statusRes.data.data?.connected) {
            clearInterval(poll);
            try { popup.close(); } catch { /* ignore */ }
            await loadStatus();
            resolve(true);
            return;
          }
        } catch {
          // ignore transient errors while the popup is mid-flow
        }
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(poll);
          try { popup.close(); } catch { /* ignore */ }
          reject(new Error("Google Calendar connection timed out. Please try again."));
        }
      }, 1500);
    });
  }, [loadStatus]);

  const disconnect = useCallback(async () => {
    const res = await disconnectCalendar();
    if (res.data?.success) {
      setStatus({ connected: false, googleEmail: null });
      return true;
    }
    throw new Error(res.data?.message || "Failed to disconnect");
  }, []);

  const syncEvent = useCallback(async (eventId) => {
    setSyncingIds((prev) => ({ ...prev, [eventId]: "syncing" }));
    try {
      const res = await syncEventToCalendar(eventId);
      if (res.data?.success) {
        setSyncingIds((prev) => ({ ...prev, [eventId]: "synced" }));
        return res.data;
      }
      throw new Error(res.data?.message || "Failed to sync event");
    } catch (err) {
      setSyncingIds((prev) => ({ ...prev, [eventId]: "error" }));
      throw err;
    }
  }, []);

  const unsyncEvent = useCallback(async (eventId) => {
    setSyncingIds((prev) => ({ ...prev, [eventId]: "syncing" }));
    try {
      const res = await unsyncEventFromCalendar(eventId);
      if (res.data?.success) {
        setSyncingIds((prev) => ({ ...prev, [eventId]: "unsynced" }));
        return true;
      }
      throw new Error(res.data?.message || "Failed to remove sync");
    } catch (err) {
      setSyncingIds((prev) => ({ ...prev, [eventId]: "error" }));
      throw err;
    }
  }, []);

  return {
    status,
    loadingStatus,
    syncingIds,
    loadStatus,
    connect,
    disconnect,
    syncEvent,
    unsyncEvent,
  };
}
