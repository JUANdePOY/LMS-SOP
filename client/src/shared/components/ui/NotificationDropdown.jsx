import { useState, useRef, useEffect } from "react";
import { Bell, Info, AlertCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import NotificationBadge from "@/shared/components/ui/NotificationBadge";
import { useNotifications, markAllBannersAsViewed } from "@/shared/stores/notificationStore.js";

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

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 2) return "Yesterday";
  return date.toLocaleDateString();
}

export default function NotificationDropdown({ showBadge = true, onFetch }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount, notifications, loading, fetched, fetch, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && !loading && !fetched) {
      fetch();
      onFetch?.();
    }
  }, [open, loading, fetched, fetch, onFetch]);

  useEffect(() => {
    if (open && fetched && notifications.length > 0) {
      markAllRead();
    }
  }, [open, fetched, notifications.length, markAllRead]);

  useEffect(() => {
    if (open) {
      markAllBannersAsViewed();
    }
  }, [open]);

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
    if (notification.link) {
      navigate(notification.link);
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
        {showBadge && <NotificationBadge count={unreadCount} />}
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
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 rounded"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                No notifications
              </div>
            ) : (
              <ul className="py-1">
                {notifications.map((notification) => {
                  const Icon = TYPE_ICON[notification.type] || Info;
                  const iconColor = TYPE_COLOR[notification.type] || TYPE_COLOR.info;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                          "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800/50",
                          !notification.is_read && "bg-blue-50/30 dark:bg-blue-900/10"
                        )}
                      >
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm", iconColor)}>
                          <Icon size={14} />
                        </span>
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
                      </button>
                    </li>
                  );
                })}
              </ul>
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
    </div>
  );
}
