import { useSyncExternalStore, useState, useCallback, useEffect } from "react";
import { getNotifications, markNotificationsRead, markAllNotificationsRead, getNotificationPreferences, updateNotificationPreferences } from "@/services/api.js";
import { getConversations } from "@/features/messaging/api/message.api";
import { playNotificationSound } from "@/shared/utils/notificationSound.js";
import { isQuietHours } from "@/shared/utils/quietHours.js";

const POLL_INTERVAL_MS = 25000;

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
let unreadMessageCount = 0;
let pendingBanners = [];
let previousUnreadServerCount = 0;
let previousUnreadMessageCount = 0;
let preferences = null;

let cachedSnapshot = null;

// Tracks which task-assignment notifications we've already surfaced as a banner
// so each assignment only produces one banner (across polls/WS refreshes).
let seenTaskNotificationIds = new Set();
let taskNotificationsInitialized = false;

function sortBanners(entries) {
  return [...entries].sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function isBannerExpired(entry) {
  return Boolean(entry.expiresAt && Date.now() > entry.expiresAt);
}

function computeSnapshot() {
  return {
    dismissed,
    serverNotifications,
    unreadServerCount,
    unreadMessageCount,
    unreadTotal: unreadServerCount + unreadMessageCount,
    unreadBannerCount: APP_BANNER_IDS.filter((id) => !dismissed.includes(id)).length,
    pendingBanners,
    preferences,
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
    const prevNotifications = serverNotifications;
    const prevUnread = unreadServerCount;
    try {
      const response = await getNotifications({ unread_only: false, limit: 50 });
      const data = response.data;
      let notifications = data.notifications || [];
      if (Array.isArray(notifications) && Array.isArray(notifications[0])) {
        notifications = notifications[0];
      }
      serverNotifications = Array.isArray(notifications) ? notifications : prevNotifications;
      unreadServerCount = data.unread_count || 0;
      if (unreadServerCount > previousUnreadServerCount && !isQuietHours(preferences) && preferences?.channels?.sound !== false) {
        playNotificationSound();
      }
      previousUnreadServerCount = unreadServerCount;

      // Surface a banner for the assigned employee when a NEW task-assignment
      // notification arrives (works for both the 25s poller and WS-driven
      // refreshes). Only genuinely new notifications are banner-ed; the first
      // fetch just seeds the seen set so pre-existing tasks don't re-banner.
      const taskNotifications = notifications.filter(
        (n) => n.entity_type === 'task' && (n.category === 'task' || !n.category)
      );
      if (taskNotificationsInitialized) {
        taskNotifications
          .filter((n) => !seenTaskNotificationIds.has(n.id))
          .forEach((n) => {
            enqueueBanner({
              id: `task-assigned-${n.id}`,
              type: 'announcement',
              title: n.title || 'New task assigned',
              message: n.body || '',
              link: n.entity_id ? `/tasks/my?task=${n.entity_id}` : (n.link || null),
              ctaLabel: 'View',
              priority: 2,
            });
          });
      } else {
        taskNotificationsInitialized = true;
      }
      taskNotifications.forEach((n) => seenTaskNotificationIds.add(n.id));

      emitChange();
      return serverNotifications;
    } catch {
      // Preserve last-known data on transient errors so the badge doesn't vanish
      serverNotifications = prevNotifications;
      unreadServerCount = prevUnread;
      emitChange();
      return [];
    }
  },

  async fetchMessagesUnread() {
    const prev = unreadMessageCount;
    try {
      const res = await getConversations();
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      unreadMessageCount = rows.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
      if (unreadMessageCount > previousUnreadMessageCount && !isQuietHours(preferences) && preferences?.channels?.sound !== false) {
        playNotificationSound();
      }
      previousUnreadMessageCount = unreadMessageCount;
      emitChange();
    } catch {
      unreadMessageCount = prev;
      emitChange();
    }
  },

  async refresh() {
    await Promise.all([this.fetchServerNotifications(), this.fetchMessagesUnread()]);
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

  async markEntityTypeRead(entityType) {
    const ids = serverNotifications
      .filter((n) => n.entity_type === entityType && !n.is_read)
      .map((n) => n.id);
    if (ids.length === 0) return;
    try {
      await markNotificationsRead(ids);
      serverNotifications = serverNotifications.map((n) =>
        ids.includes(n.id) ? { ...n, is_read: true } : n
      );
      unreadServerCount = Math.max(0, unreadServerCount - ids.length);
      emitChange();
    } catch {
      /* ignore */
    }
  },

  clearAll() {
    dismissed = [];
    setDismissedToStorage(dismissed);
    serverNotifications = [];
    unreadServerCount = 0;
    unreadMessageCount = 0;
    pendingBanners = [];
    emitChange();
  },

  clearServerNotifications() {
    serverNotifications = [];
    unreadServerCount = 0;
    emitChange();
  },

  async fetchPreferences() {
    try {
      const res = await getNotificationPreferences();
      preferences = res.data?.preferences || null;
    } catch {
      preferences = null;
    }
    emitChange();
    return preferences;
  },

  async updatePreferences(patch) {
    try {
      const res = await updateNotificationPreferences(patch);
      preferences = res.data?.preferences || preferences;
    } catch {
      /* ignore */
    }
    emitChange();
    return preferences;
  },

  enqueueBanner(entry) {
    if (!entry?.id || dismissed.includes(entry.id) || isBannerExpired(entry)) return;
    if (pendingBanners.some((b) => b.id === entry.id)) return;
    pendingBanners = sortBanners([...pendingBanners, entry]);
    emitChange();
  },

  clearEnqueuedBanners() {
    pendingBanners = [];
    emitChange();
  },

  getSnapshot,

  subscribe(callback) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  getSystemNotifications() {
    return serverNotifications.filter((n) => n.entity_type);
  },

  getUnreadSystemNotifications() {
    return serverNotifications.filter((n) => n.entity_type && !n.is_read);
  },

  getEnrollmentNotificationCount() {
    return serverNotifications.filter((n) => n.entity_type === 'enrollment' && !n.is_read).length;
  },

  getUnreadEnrollmentNotifications() {
    return serverNotifications
      .filter((n) => n.entity_type === 'enrollment' && !n.is_read)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getUnreadCountByEntityType(entityType) {
    return serverNotifications.filter((n) => n.entity_type === entityType && !n.is_read).length;
  },

  getSystemNotificationCount() {
    return serverNotifications.filter((n) => ['sop', 'course', 'task'].includes(n.entity_type) && !n.is_read).length;
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

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    await NotificationStore.fetchServerNotifications();
    if (showSpinner) setLoading(false);
    setFetched(true);
  }, []);

  const refresh = useCallback(async () => {
    await NotificationStore.refresh();
    setFetched(true);
  }, []);

  const markRead = useCallback(async (id) => {
    await NotificationStore.markRead(id);
  }, []);

  const markAllReadAction = useCallback(async () => {
    await NotificationStore.markAllRead();
  }, []);

  const markEntityTypeReadAction = useCallback(async (entityType) => {
    await NotificationStore.markEntityTypeRead(entityType);
  }, []);

  const clearAll = useCallback(() => {
    NotificationStore.clearServerNotifications();
  }, []);

  const fetchPreferences = useCallback(async () => {
    return NotificationStore.fetchPreferences();
  }, []);

  const updatePreferences = useCallback(async (patch) => {
    return NotificationStore.updatePreferences(patch);
  }, []);

  return {
    notifications: store.serverNotifications,
    unreadCount: store.unreadTotal,
    unreadServerCount: store.unreadServerCount,
    unreadMessageCount: store.unreadMessageCount,
    dismissed: store.dismissed,
    preferences: store.preferences,
    loading,
    fetched,
    fetch: load,
    refresh,
    markRead,
    markAllRead: markAllReadAction,
    markEntityTypeRead: markEntityTypeReadAction,
    clearAll,
    fetchPreferences,
    updatePreferences,
    getSystemNotifications: () => NotificationStore.getSystemNotifications(),
    getUnreadSystemNotifications: () => NotificationStore.getUnreadSystemNotifications(),
    getEnrollmentNotificationCount: () => NotificationStore.getEnrollmentNotificationCount(),
    getUnreadEnrollmentNotifications: () => NotificationStore.getUnreadEnrollmentNotifications(),
    getUnreadCountByEntityType: (entityType) => NotificationStore.getUnreadCountByEntityType(entityType),
    getSystemNotificationCount: () => NotificationStore.getSystemNotificationCount(),
  };
};

export function useNotificationPoller() {
  useEffect(() => {
    NotificationStore.refresh();
    const interval = setInterval(() => NotificationStore.refresh(), POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") NotificationStore.refresh();
    };
    const onFocus = () => NotificationStore.refresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}

export function isBannerDismissed(id) {
  return dismissed.includes(id);
}

export function notifyDismissBanner(id) {
  NotificationStore.dismiss(id);
}

export function notifyHideBanner(id) {
  if (dismissed.includes(id)) return;
  dismissed = [...dismissed, id];
  emitChange();
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

export function enqueueBanner(entry) {
  NotificationStore.enqueueBanner(entry);
}

export function clearEnqueuedBanners() {
  NotificationStore.clearEnqueuedBanners();
}
