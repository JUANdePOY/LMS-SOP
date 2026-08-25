import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, Info, AlertCircle, Check, BookOpen, FileText, HelpCircle, Award, BookMarked, UserPlus, Filter, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import ConfirmationDialog from "@/shared/components/ui/ConfirmationDialog";
import NotificationBadge from "@/shared/components/ui/NotificationBadge";
import { useNotifications } from "@/shared/stores/notificationStore.js";
import { deleteNotifications } from "@/services/api.js";

const TYPE_ICON = {
  info: Info,
  warning: AlertCircle,
  error: AlertCircle,
  success: Check,
};

const TYPE_COLOR = {
  info: "bg-blue-100 text-blue-600",
  warning: "bg-amber-100 text-amber-600",
  error: "bg-red-100 text-red-600",
  success: "bg-emerald-100 text-emerald-600",
};

const ENTITY_ICON = {
  course: BookOpen,
  sop: FileText,
  quiz: HelpCircle,
  certificate: Award,
  library: BookMarked,
  enrollment: UserPlus,
};

const ENTITY_ICON_COLOR = {
  course: "bg-orange-100 text-orange-600",
  sop: "bg-blue-100 text-blue-600",
  quiz: "bg-purple-100 text-purple-600",
  certificate: "bg-emerald-100 text-emerald-600",
  library: "bg-teal-100 text-teal-600",
  enrollment: "bg-sky-100 text-sky-600",
};

const CATEGORY_LABEL = {
  system: "System",
  social: "Social",
  training: "Training",
  security: "Security",
  marketing: "Marketing",
};

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMins = Math.floor((now - date) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 2) return "Yesterday";
  return date.toLocaleDateString();
}

function dateGroupLabel(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = startOfToday - 86400000;
  const t = date.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

export default function NotificationDropdown({ showBadge = true, onFetch, count }) {
  const [open, setOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [category, setCategory] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount, notifications, loading, fetched, fetch, markRead, markAllRead, clearAll } = useNotifications();
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const present = new Set((notifications || []).map((n) => n.category || "system"));
    return ["all", ...Array.from(present)];
  }, [notifications]);

  const filtered = useMemo(() => {
    return (notifications || []).filter((n) => {
      if (unreadOnly && n.is_read) return false;
      if (category !== "all" && (n.category || "system") !== category) return false;
      return true;
    });
  }, [notifications, unreadOnly, category]);

  const grouped = useMemo(() => {
    const order = ["Today", "Yesterday", "Earlier"];
    const map = {};
    filtered.forEach((n) => {
      const label = dateGroupLabel(n.created_at);
      if (!map[label]) map[label] = [];
      map[label].push(n);
    });
    return order.filter((l) => map[l]?.length).map((l) => ({ label: l, items: map[l] }));
  }, [filtered]);

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteNotifications([]);
      clearAll();
    } catch {
      /* error silently ignored; store retains data on failure */
    } finally {
      setDeleting(false);
      setDeleteAllOpen(false);
    }
  };

  useEffect(() => {
    if (open && !loading && !fetched) {
      fetch();
      onFetch?.();
    }
  }, [open, loading, fetched, fetch, onFetch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleBellClick = () => setOpen((v) => !v);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markRead(notification.id);
    }
    const target = notification.action_url || notification.link;
    if (target) {
      navigate(target);
    }
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div ref={dropdownRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleBellClick}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white hover:text-white hover:bg-white/15 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        <Bell size={18} />
        {showBadge && <NotificationBadge count={count != null ? count : unreadCount} />}
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl shadow-neutral-200/80 dark:shadow-neutral-950/60 ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notifications</h3>
            {hasUnread && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteAllOpen(true)}
                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500/30 rounded"
                >
                  Delete all
                </button>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 rounded"
                >
                  Mark all read
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            <Filter size={13} className="text-neutral-400 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none",
                  category === cat
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                )}
              >
                {cat === "all" ? "All" : (CATEGORY_LABEL[cat] || cat)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUnreadOnly((v) => !v)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus:outline-none flex items-center gap-1",
                unreadOnly
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              )}
            >
              <Clock size={11} /> Unread
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Loading notifications...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <Bell size={24} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">You are all caught up!</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">No new notifications</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label}>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      {group.label}
                    </p>
                  </div>
                  <ul className="py-1">
                    {group.items.map((notification) => {
                      const EntityIcon = ENTITY_ICON[notification.entity_type] || TYPE_ICON[notification.type] || Info;
                      const iconColor = ENTITY_ICON_COLOR[notification.entity_type]
                        || TYPE_COLOR[notification.type]
                        || TYPE_COLOR.info;
                      return (
                        <li key={notification.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleNotificationClick(notification)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleNotificationClick(notification); }}
                            className={cn(
                              "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                              "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800/50 cursor-pointer",
                              !notification.is_read && "bg-blue-50/30 dark:bg-blue-900/10"
                            )}
                          >
                            {notification.image_url ? (
                              <img
                                src={notification.image_url}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                              />
                            ) : (
                              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm", iconColor)}>
                                <EntityIcon size={14} />
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  notification.is_read
                                    ? "text-neutral-700 dark:text-neutral-300"
                                    : "text-neutral-900 dark:text-neutral-100"
                                )}
                              >
                                {notification.title}
                              </p>
                              {notification.body && (
                                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 break-words">
                                  {notification.body}
                                </p>
                              )}
                              <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                {formatTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>
                          {notification.action_label && notification.action_url && (
                            <div className="px-4 pb-2 -mt-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleNotificationClick(notification); }}
                                className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                              >
                                {notification.action_label}
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  navigate("/notifications");
                  setOpen(false);
                }}
                className="w-full text-center text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors focus:outline-none"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmationDialog
        open={deleteAllOpen}
        title="Delete all notifications"
        description="This will permanently delete all your notifications. This action cannot be undone."
        confirmLabel="Delete all"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteAllOpen(false)}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
