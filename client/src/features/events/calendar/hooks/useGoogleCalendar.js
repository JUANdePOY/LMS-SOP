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
    return new Promise((resolve, reject) => {
      const popup = window.open(url, "google-calendar-auth", "width=520,height=640");
      if (!popup) {
        reject(new Error("Popup blocked. Please allow popups and try again."));
        return;
      }

      const tryClosePopup = (win) => {
        if (!win) return;
        // Only attempt to close the popup if it still references this opener.
        // When COOP/COEP severs the opener link, `win.opener` becomes `null` —
        // checking `opener` is less likely to trigger COOP console warnings
        // than reading `closed` or `location` on the popup.
        try {
          if (win.opener === window) {
            try {
              win.close();
            } catch (e) {
              /* ignore close errors */
            }
          }
        } catch (e) {
          // If reading `opener` throws, give up silently.
        }
      };

      // Some hosting setups send Cross-Origin-Opener-Policy, which severs the
      // opener<->popup link and breaks both window.postMessage and popup.closed.
      // To stay resilient we poll our own /calendar/status endpoint instead of
      // relying on cross-window signaling. The connection is confirmed once the
      // backend reports the token as stored.
      let attempts = 0;
      const MAX_ATTEMPTS = 90; // ~90s at 1s intervals (Google API + bulk sync can be slow)
      const poll = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await getCalendarStatus();
          if (statusRes.data?.success && statusRes.data.data?.connected) {
            clearInterval(poll);
            tryClosePopup(popup);
            await loadStatus(true);
            resolve(true);
            return;
          }
        } catch {
          // ignore transient errors while the popup is mid-flow
        }
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(poll);
          tryClosePopup(popup);
          // Final definitive check: the bulk sync may have just finished, so a
          // last status read decides success vs. timeout instead of guessing.
          try {
            const finalRes = await getCalendarStatus();
            if (finalRes.data?.success && finalRes.data.data?.connected) {
              await loadStatus(true);
              resolve(true);
              return;
            }
          } catch { /* fall through to reject */ }
          reject(new Error("Google Calendar connection timed out. Please try again."));
        }
      }, 1000);
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
