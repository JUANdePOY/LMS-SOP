import { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Users, CheckCircle2, XCircle, Clock, AlertTriangle, UserMinus, Loader, ChevronRight, Radio } from 'lucide-react';
import { getMyEvents, getEventStatus } from '@/services/attendanceApiService';

const STATUS_STYLES = {
  present: { label: 'Present', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: CheckCircle2 },
  absent: { label: 'Absent', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', icon: XCircle },
  late: { label: 'Late', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: Clock },
  excused: { label: 'Excused', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-emerald-900/40', icon: UserMinus },
  pending: { label: 'Pending', color: 'text-neutral-500 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', icon: AlertTriangle },
};

function MiniStat({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{value}</span>
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}

function EventCard({ event, eventType, onSelect }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEventStatus(eventType, event.id);
      setStatusData(res.data?.data);
    } catch {
      setStatusData(null);
    } finally {
      setLoading(false);
    }
  }, [eventType, event.id]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const stats = statusData?.stats;
  const total = stats ? (stats.total_participants || stats.total_attendees || 0) : 0;
  const present = stats ? (stats.present_count || 0) : 0;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const dateLabel = eventType === 'internal'
    ? (event.start_datetime ? new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')
    : (event.start_date ? new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

  return (
    <button
      onClick={() => onSelect(eventType, event.id, event)}
      className="w-full text-left bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
              eventType === 'internal'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
            }`}>
              {eventType}
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
              event.status === 'ongoing' || event.status === 'open'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : event.status === 'completed' || event.status === 'closed'
                  ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
            }`}>
              {event.status}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {event.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateLabel}
            </span>
            {event.venue && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{event.venue}</span>
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-neutral-300 dark:text-neutral-600 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
      </div>

      {loading && !statusData ? (
        <div className="flex items-center gap-2 mt-3 text-xs text-neutral-400">
          <Loader className="h-3 w-3 animate-spin" />
          Loading stats...
        </div>
      ) : stats ? (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <Users className="h-3 w-3" />
              <span>{present}/{total} scanned</span>
            </div>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <MiniStat label="Present" value={stats.present_count || 0} color="text-emerald-600 dark:text-emerald-400" />
            <MiniStat label="Late" value={stats.late_count || 0} color="text-amber-600 dark:text-amber-400" />
            <MiniStat label="Absent" value={stats.absent_count || 0} color="text-red-600 dark:text-red-400" />
            <MiniStat label="Pending" value={stats.pending_count || 0} color="text-neutral-500 dark:text-neutral-400" />
          </div>
        </div>
      ) : null}
    </button>
  );
}

export default function AttendanceDashboard({ onSelectEvent, filter = 'all' }) {
  const [events, setEvents] = useState({ internal: [], external: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortAsc, setSortAsc] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyEvents();
      const data = res.data?.data;
      if (data) {
        setEvents({
          internal: data.internal || [],
          external: data.external || []
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const allEvents = [
    ...events.internal.map(e => ({ ...e, eventType: 'internal' })),
    ...events.external.map(e => ({ ...e, eventType: 'external' }))
  ].sort((a, b) => {
    const dateA = new Date(a.start_datetime || a.start_date || 0);
    const dateB = new Date(b.start_datetime || b.start_date || 0);
    return sortAsc ? dateA - dateB : dateB - dateA;
  });

  const filteredEvents = filter === 'all'
    ? allEvents
    : allEvents.filter(e => e.eventType === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading your events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button
          onClick={loadEvents}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Radio className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-3" />
        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-1">No Events Assigned</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-sm">
          You are not assigned as a facilitator to any events. Contact an admin to get assigned.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setSortAsc((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          {sortAsc ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <EventCard
            key={`${event.eventType}-${event.id}`}
            event={event}
            eventType={event.eventType}
            onSelect={onSelectEvent}
          />
        ))}
      </div>
    </div>
  );
}
