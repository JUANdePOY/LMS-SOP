import { useState, useEffect, useCallback } from 'react';
import { Bell, Info, AlertCircle, Check, BookOpen, FileText, HelpCircle, Award, BookMarked } from 'lucide-react';
import { getNotifications, markNotificationsRead, markAllNotificationsRead } from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';
import { cn } from '@/lib/utils';

const TYPE_ICON = {
  info: Info,
  warning: AlertCircle,
  error: AlertCircle,
  success: Check,
};

const TYPE_COLOR = {
  info: 'bg-blue-100 text-blue-600',
  warning: 'bg-amber-100 text-amber-600',
  error: 'bg-red-100 text-red-600',
  success: 'bg-emerald-100 text-emerald-600',
};

const ENTITY_ICON = {
  course: BookOpen,
  sop: FileText,
  quiz: HelpCircle,
  certificate: Award,
  library: BookMarked,
};

const ENTITY_BORDER = {
  course: 'border-l-orange-400',
  sop: 'border-l-blue-400',
  quiz: 'border-l-purple-400',
  certificate: 'border-l-emerald-400',
  library: 'border-l-teal-400',
};

const ENTITY_ICON_COLOR = {
  course: 'bg-orange-100 text-orange-600',
  sop: 'bg-blue-100 text-blue-600',
  quiz: 'bg-purple-100 text-purple-600',
  certificate: 'bg-emerald-100 text-emerald-600',
  library: 'bg-teal-100 text-teal-600',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'course', label: 'Courses' },
  { value: 'sop', label: 'SOPs' },
  { value: 'quiz', label: 'Quizzes' },
  { value: 'certificate', label: 'Certificates' },
];

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function Notifications() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ unread_only: false, limit: 50 });
      const items = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
      setNotifications(items);
    } catch {
      addToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationsRead([id]);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      addToast('Failed to mark notification as read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      addToast('All notifications marked as read', 'success');
    } catch {
      addToast('Failed to mark all notifications as read', 'error');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleMarkSelectedRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      await markNotificationsRead(selectedIds);
      setNotifications((prev) => prev.map((n) => (selectedIds.includes(n.id) ? { ...n, is_read: true } : n)));
      setSelectedIds([]);
      addToast('Selected notifications marked as read', 'success');
    } catch {
      addToast('Failed to mark selected notifications as read', 'error');
    }
  };

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.entity_type === filter);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Notifications</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              filter === opt.value
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-neutral-500">Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center">
          <Bell size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg mb-2">
              <span className="text-xs text-blue-700 dark:text-blue-300">{selectedIds.length} selected</span>
              <button
                type="button"
                onClick={handleMarkSelectedRead}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
              >
                Mark selected as read
              </button>
            </div>
          )}
          {filtered.map((notification) => {
            const EntityIcon = ENTITY_ICON[notification.entity_type] || TYPE_ICON[notification.type] || Info;
            const iconColor = ENTITY_ICON_COLOR[notification.entity_type] || TYPE_COLOR[notification.type] || TYPE_COLOR.info;
            const borderClass = ENTITY_BORDER[notification.entity_type] || 'border-l-transparent';
            return (
              <div
                key={notification.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 rounded-lg border-l-2 transition-colors cursor-pointer',
                  borderClass,
                  notification.is_read
                    ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                    : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                )}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
              >
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm', iconColor)}>
                  <EntityIcon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', notification.is_read ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-900 dark:text-neutral-100')}>
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 break-words">{notification.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">{formatDate(notification.created_at)}</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(notification.id)}
                  onChange={() => toggleSelect(notification.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
