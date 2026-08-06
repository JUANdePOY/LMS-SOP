import { useSyncExternalStore, useState, useCallback } from "react";
import { getNotifications, markNotificationsRead, markAllNotificationsRead } from "@/services/api.js";

const STORAGE_KEY = "lms_dismissed_banners";

const BANNER_PATH_MAP = {
  "1": "/announcements",
  "2": "/events",
};

export const APP_BANNER_IDS = Object.keys(BANNER_PATH_MAP);

function getDismissedFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setDismissedToStorage(ids) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* quota or other storage error - ignore */
  }
}

const listeners = new Set();

let dismissed = getDismissedFromStorage();
let serverNotifications = [];
let unreadServerCount = 0;

let cachedSnapshot = null;

function computeSnapshot() {
  return {
    dismissed,
    serverNotifications,
    unreadServerCount,
    unreadTotal: unreadServerCount,
    unreadBannerCount: APP_BANNER_IDS.filter((id) => !dismissed.includes(id)).length,
  };
}

function getSnapshot() {
  if (!cachedSnapshot) {
    cachedSnapshot = computeSnapshot();
  }
  return cachedSnapshot;
}

function emitChange() {
  cachedSnapshot = null;
  listeners.forEach((l) => l());
}

export const NotificationStore = {
  isDismissed(id) {
    return dismissed.includes(id);
  },

  dismiss(id) {
    if (dismissed.includes(id)) return;
    dismissed = [...dismissed, id];
    setDismissedToStorage(dismissed);
    emitChange();
  },

  dismissAll(ids) {
    const newIds = ids.filter((id) => !dismissed.includes(id));
    if (newIds.length === 0) return;
    dismissed = [...dismissed, ...newIds];
    setDismissedToStorage(dismissed);
    emitChange();
  },

  async fetchServerNotifications() {
    try {
      const response = await getNotifications({ unread_only: false, limit: 50 });
      const data = response.data;
      let notifications = data.notifications || [];
      if (Array.isArray(notifications) && Array.isArray(notifications[0])) {
        notifications = notifications[0];
      }
      serverNotifications = Array.isArray(notifications) ? notifications : [];
      unreadServerCount = data.unread_count || 0;
      emitChange();
      return serverNotifications;
    } catch {
      serverNotifications = [];
      unreadServerCount = 0;
      emitChange();
      return [];
    }
  },

  async markAllRead() {
    try {
      await markAllNotificationsRead();
      serverNotifications = serverNotifications.map((n) => ({ ...n, is_read: true }));
      unreadServerCount = 0;
      emitChange();
    } catch {
      /* ignore */
    }
  },

  async markRead(id) {
    const notification = serverNotifications.find((n) => n.id === id);
    if (notification && !notification.is_read) {
      try {
        await markNotificationsRead([id]);
        serverNotifications = serverNotifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        );
        unreadServerCount = Math.max(0, unreadServerCount - 1);
        emitChange();
      } catch {
        /* ignore */
      }
    }
  },

  clearAll() {
    dismissed = [];
    setDismissedToStorage(dismissed);
    serverNotifications = [];
    unreadServerCount = 0;
    emitChange();
  },

  getSnapshot,

  subscribe(callback) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};

export function useNotificationStore() {
  return useSyncExternalStore(
    NotificationStore.subscribe,
    () => NotificationStore.getSnapshot(),
    () => NotificationStore.getSnapshot()
  );
}

export const useNotifications = () => {
  const store = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetch = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    await NotificationStore.fetchServerNotifications();
    setLoading(false);
    setFetched(true);
  }, [fetched]);

  const markRead = useCallback(async (id) => {
    await NotificationStore.markRead(id);
  }, []);

  const markAllReadAction = useCallback(async () => {
    await NotificationStore.markAllRead();
  }, []);

  return {
    notifications: store.serverNotifications,
    unreadCount: store.unreadTotal,
    unreadServerCount: store.unreadServerCount,
    dismissed: store.dismissed,
    loading,
    fetched,
    fetch,
    markRead,
    markAllRead: markAllReadAction,
  };
};

export function isBannerDismissed(id) {
  return dismissed.includes(id);
}

export function notifyDismissBanner(id) {
  NotificationStore.dismiss(id);
}

export function notifyDismissAllBanners(ids) {
  NotificationStore.dismissAll(ids);
}

export function markAllBannersAsViewed() {
  NotificationStore.dismissAll(APP_BANNER_IDS);
}

export function clearAllDismissedBanners() {
  NotificationStore.clearAll();
}

export function getUnreadByPath(bannerIds, path) {
  return bannerIds.filter((id) => BANNER_PATH_MAP[id] === path && !dismissed.includes(id)).length;
}
