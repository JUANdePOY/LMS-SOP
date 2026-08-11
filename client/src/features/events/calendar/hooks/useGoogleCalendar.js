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
      const onMessage = (e) => {
        if (e.data && e.data.type === "calendar-callback") {
          window.removeEventListener("message", onMessage);
          if (e.data.success) {
            loadStatus().then(() => resolve(true));
          } else {
            reject(new Error("Google Calendar connection failed"));
          }
        }
      };
      window.addEventListener("message", onMessage);
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener("message", onMessage);
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
