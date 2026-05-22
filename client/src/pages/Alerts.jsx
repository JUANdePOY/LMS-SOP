import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell, AlertTriangle, AlertCircle, Info, Check, RefreshCw, Plus, Filter,
  Calendar, Users, Target, TrendingUp, Award, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAlerts,
  createAlert,
  markAlertRead,
  getAlertsInsights,
} from '@/services/api';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG = {
  critical: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: AlertTriangle,
    label: 'Critical',
  },
  warning: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertCircle,
    label: 'Warning',
  },
  info: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Info,
    label: 'Info',
  },
};

function AlertCard({ alert, onMarkRead }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  const isRead = alert.is_read;

  const handleMark = async () => {
    if (isRead) return;
    await onMarkRead(alert.id);
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        cfg.border,
        isRead ? 'opacity-60' : cfg.bg,
        'hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 rounded-full p-1.5', cfg.bg)}>
          <Icon className={cn('h-4 w-4', cfg.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-sm font-semibold', cfg.color)}>
              {alert.title}
            </span>
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
              {alert.source.toUpperCase()}
            </span>
            {alert.entity_name && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                {alert.entity_name}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
            {alert.message}
          </p>

          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
            <span>{new Date(alert.created_at).toLocaleString()}</span>
            <div className="flex items-center gap-2">
              {isRead ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="h-3 w-3" /> Read
                </span>
              ) : (
                <button
                  onClick={handleMark}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, count, colorClass, icon: Icon }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
          <div className={cn('text-3xl font-semibold mt-1', colorClass)}>{count}</div>
        </div>
        <Icon className={cn('h-8 w-8', colorClass)} />
      </div>
    </div>
  );
}

function CreateBroadcastModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    message: '',
    target_role: 'all',
    target_group_id: '',
    target_squadron_id: '',
    target_area_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        target_role: form.target_role,
      };
      if (form.target_group_id) payload.target_group_id = parseInt(form.target_group_id, 10);
      if (form.target_squadron_id) payload.target_squadron_id = parseInt(form.target_squadron_id, 10);
      if (form.target_area_id) payload.target_area_id = parseInt(form.target_area_id, 10);

      await createAlert(payload);
      onCreated();
      onClose();
      setForm({ title: '', message: '', target_role: 'all', target_group_id: '', target_squadron_id: '', target_area_id: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" /> Create Broadcast Alert
        </h3>
        <p className="text-sm text-neutral-500 mt-1">Visible to users matching the target scope</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              placeholder="System maintenance this weekend"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              placeholder="The system will be unavailable for scheduled maintenance from 0200-0500."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Target Role</label>
              <select
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              >
                <option value="all">All Users</option>
                <option value="admin">Admins Only</option>
                <option value="reservist">Reservists Only</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Target Group ID (optional)</label>
              <input
                type="number"
                value={form.target_group_id}
                onChange={(e) => setForm({ ...form, target_group_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
                placeholder="Leave blank for all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Target Squadron ID (optional)</label>
              <input
                type="number"
                value={form.target_squadron_id}
                onChange={(e) => setForm({ ...form, target_squadron_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Target Area ID (optional)</label>
              <input
                type="number"
                value={form.target_area_id}
                onChange={(e) => setForm({ ...form, target_area_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Broadcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Alerts() {
  const { user, isAnyAdmin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, info: 0, unread: 0, total: 0 });
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    severity: '',
    type: '',
    unread_only: false,
    scope: 'all',
    search: '',
    start_date: '',
    end_date: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [pagination, setPagination] = useState(null);

  const [showCreate, setShowCreate] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL on mount
  useEffect(() => {
    const initialFilters = {
      severity: searchParams.get('severity') || '',
      type: searchParams.get('type') || '',
      unread_only: searchParams.get('unread_only') === '1',
      scope: searchParams.get('scope') || 'all',
      search: searchParams.get('search') || '',
      start_date: searchParams.get('start_date') || '',
      end_date: searchParams.get('end_date') || '',
    };
    setFilters(initialFilters);
    const initialPage = parseInt(searchParams.get('page') || '1', 10);
    setPage(Math.max(1, initialPage));
  }, []);

  // Sync filters + page to URL when they change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.type) params.set('type', filters.type);
    if (filters.unread_only) params.set('unread_only', '1');
    if (filters.search) params.set('search', filters.search);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    if (page > 1) params.set('page', String(page));
    // keep scope for future
    setSearchParams(params, { replace: true });
  }, [filters, page]);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (filters.severity) params.severity = filters.severity;
      if (filters.type) params.type = filters.type;
      if (filters.unread_only) params.unread_only = '1';
      if (filters.search) params.search = filters.search;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const res = await getAlerts(params);
      setAlerts(res.data?.data?.alerts || []);
      setSummary(res.data?.data?.summary || { critical: 0, warning: 0, info: 0, unread: 0, total: 0 });
      setPagination(res.data?.data?.pagination || null);
    } catch (e) {
      console.error(e);
      setError('Failed to load alerts');
      setAlerts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await getAlertsInsights();
      setInsights(res.data?.data || null);
    } catch (e) {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Reset to first page when filters change (except page itself)
  useEffect(() => {
    setPage(1);
  }, [filters.severity, filters.type, filters.unread_only, filters.search, filters.start_date, filters.end_date]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleMarkRead = async (alertId) => {
    try {
      await markAlertRead(alertId);
      // optimistic update
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      );
      setSummary((prev) => ({
        ...prev,
        unread: Math.max(0, (prev.unread || 0) - 1),
      }));
    } catch (e) {
      // fallback refresh
      fetchAlerts();
    }
  };

  const handleCreateSuccess = () => {
    fetchAlerts();
  };

  const handleClearFilters = () => {
    setFilters({
      severity: '',
      type: '',
      unread_only: false,
      scope: 'all',
      search: '',
      start_date: '',
      end_date: '',
    });
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    const unreadOnPage = alerts.filter(a => !a.is_read);
    if (unreadOnPage.length === 0) return;

    try {
      await Promise.all(unreadOnPage.map(a => markAlertRead(a.id)));
      // optimistic
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setSummary(prev => ({
        ...prev,
        unread: Math.max(0, (prev.unread || 0) - unreadOnPage.length),
      }));
    } catch (e) {
      fetchAlerts();
    }
  };

  // Group alerts by relative date for better scanning
  const groupedAlerts = useMemo(() => {
    if (!alerts.length) return [];
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    alerts.forEach(alert => {
      const d = new Date(alert.created_at);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
      let label;
      if (diffDays === 0) label = 'Today';
      else if (diffDays === 1) label = 'Yesterday';
      else if (diffDays <= 7) label = 'This Week';
      else label = 'Older';
      if (!groups[label]) groups[label] = [];
      groups[label].push(alert);
    });
    const order = ['Today', 'Yesterday', 'This Week', 'Older'];
    return order.filter(l => groups[l]).map(label => ({ label, items: groups[label] }));
  }, [alerts]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 dark:bg-indigo-500/10 p-2">
              <Bell className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Alerts &amp; Insights</h1>
              <p className="text-sm text-neutral-500">System-generated alerts, broadcast notices, and positive trends</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>

          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" /> Clear
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={!alerts.some(a => !a.is_read)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Mark page read
          </button>

          {isAnyAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Create Broadcast
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Critical" count={summary.critical} colorClass="text-red-600" icon={AlertTriangle} />
        <SummaryCard label="Warning" count={summary.warning} colorClass="text-amber-600" icon={AlertCircle} />
        <SummaryCard label="Info" count={summary.info} colorClass="text-blue-600" icon={Info} />
        <SummaryCard label="Unread" count={summary.unread} colorClass="text-neutral-600" icon={Bell} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Filter className="h-4 w-4" /> Filters
        </div>

        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search title or message..."
          className="w-56 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-sm"
        />

        <input
          type="date"
          value={filters.start_date}
          onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1.5 text-sm"
          title="From date"
        />
        <span className="text-xs text-neutral-400">to</span>
        <input
          type="date"
          value={filters.end_date}
          onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1.5 text-sm"
          title="To date"
        />

        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-sm"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          <option value="readiness_low">Readiness Low</option>
          <option value="no_training">No Training</option>
          <option value="low_attendance">Low Attendance</option>
          <option value="supply_low">Low Stock</option>
          <option value="supply_overdue">Overdue Supplies</option>
          <option value="profile_incomplete">Personnel</option>
          <option value="training_upcoming">Upcoming Training</option>
          <option value="broadcast">Broadcast</option>
        </select>

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.unread_only}
            onChange={(e) => setFilters({ ...filters, unread_only: e.target.checked })}
            className="accent-indigo-600"
          />
          Unread only
        </label>

        <div className="ml-auto text-xs text-neutral-500">
          {pagination?.total ?? summary.total} alerts • Scope: {user?.scope_squadron_id ? 'Squadron' : user?.scope_group_id ? 'Group' : user?.scope_arsen_id ? 'Arsen' : 'All'}
        </div>
      </div>

      {/* Alerts List */}
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-neutral-500">Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center text-neutral-500">
          No alerts match the current filters.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {groupedAlerts.map(group => (
              <div key={group.label}>
                <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2 px-1">
                  {group.label}
                </div>
                <div className="space-y-3">
                  {group.items.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} onMarkRead={handleMarkRead} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
              <div>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, pagination.total)} of {pagination.total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  ← Prev
                </button>
                <span className="px-2 tabular-nums">Page {page} / {pagination.totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Insights Section */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold tracking-tight">Positive Insights &amp; Trends</h2>
        </div>

        {!insights ? (
          <div className="text-sm text-neutral-500">Loading insights…</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                <TrendingUp className="h-4 w-4" /> Top Training Squadrons (This Month)
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {(insights.top_training_squadrons || []).slice(0, 3).map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{s.squadron_name}</span>
                    <span className="font-mono text-emerald-600">{s.training_count} trainings</span>
                  </li>
                ))}
                {(!insights.top_training_squadrons || insights.top_training_squadrons.length === 0) && (
                  <li className="text-neutral-500">No data yet</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                <Users className="h-4 w-4" /> Highest Attendance Rates
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {(insights.highest_attendance || []).slice(0, 3).map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{s.squadron_name}</span>
                    <span className="font-mono text-emerald-600">{s.avg_attendance_rate}%</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                <Target className="h-4 w-4" /> Overall Force Readiness
              </div>
              <div className="mt-3 text-4xl font-semibold text-emerald-600">
                {Number(insights.overall_readiness || 0).toFixed(1)}%
              </div>
              <div className="text-xs text-emerald-700/70 mt-1">Current computed average across all reservists</div>
            </div>
          </div>
        )}
      </div>

      <CreateBroadcastModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreateSuccess}
      />
    </div>
  );
}
