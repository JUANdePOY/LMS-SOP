import { useState, useEffect, useCallback } from 'react';
import { Loader, ChevronRight, Radio, AlertTriangle } from 'lucide-react';
import { getMyEvents, getEventStatus } from '@/services/attendanceApiService';

function EventRow({ event, eventType, onSelect }) {
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

  const dateLabel = eventType === 'internal'
    ? (event.start_datetime ? new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')
    : (event.start_date ? new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
          eventType === 'internal'
            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
            : 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
        }`}>
          {eventType}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{event.title}</td>
      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{dateLabel}</td>
      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{event.venue || '—'}</td>
      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
        {loading && !statusData ? <Loader className="h-3 w-3 animate-spin" /> : present}/{total}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
          event.status === 'ongoing' || event.status === 'open'
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            : event.status === 'completed' || event.status === 'closed'
              ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
        }`}>
          {event.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onSelect(eventType, event.id, event)}
          className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
          title="View Details"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
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

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Type</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Event</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Date</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Location</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Scanned</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">View</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length > 0 ? filteredEvents.map((event) => (
              <EventRow
                key={`${event.eventType}-${event.id}`}
                event={event}
                eventType={event.eventType}
                onSelect={onSelectEvent}
              />
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  No events assigned
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
