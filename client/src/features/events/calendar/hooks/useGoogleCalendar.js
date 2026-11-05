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

  const loadStatus = useCallback(async (force = false) => {
    setLoadingStatus(true);
    try {
      const res = await getCalendarStatus(force);
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
    const popup = window.open(url, "google-calendar-auth", "width=520,height=640");
    if (!popup) throw new Error("Popup blocked. Please allow popups and try again.");

    // Wait for the OAuth popup to complete (it auto-closes after the callback).
    await new Promise((resolve) => {
      const check = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(check);
            resolve();
          }
        } catch {
          // ignore
        }
      }, 500);
      // Safety timeout
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 30000);
    });

    await loadStatus(true);
    return true;
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

  // Reflect a successful bulk sync (e.g. right after connecting) on the
  // individual event buttons so each card shows the "Synced" state instead of
  // staying on "Add to calendar". Only marks ids that aren't already in an
  // error state, so a prior failed sync isn't silently hidden.
  const markEventsSynced = useCallback((eventIds = []) => {
    setSyncingIds((prev) => {
      const next = { ...prev };
      for (const id of eventIds) {
        if (next[id] !== "error") next[id] = "synced";
      }
      return next;
    });
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
    markEventsSynced,
  };
}
