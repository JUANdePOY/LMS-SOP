import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Colour each task by priority so overlapping tasks on the same day are easy to
// tell apart. Lowest-contrast option kept for "none/unknown".
const PRIORITY_STYLES = {
  critical: 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-300',
  high: 'border-orange-500 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  medium: 'border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  low: 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};
const DEFAULT_STYLE = 'border-slate-400 bg-slate-400/15 text-slate-700 dark:text-slate-300';

const PRIORITY_LEGEND = [
  { key: 'critical', label: 'Critical', dot: 'bg-red-500' },
  { key: 'high', label: 'High', dot: 'bg-orange-500' },
  { key: 'medium', label: 'Medium', dot: 'bg-blue-500' },
  { key: 'low', label: 'Low', dot: 'bg-emerald-500' },
];

const DAY_MS = 86400000;

export default function TaskCalendar({ tasks, onView }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = startOfDay(new Date(year, month, 1)).getTime();
  const monthEnd = startOfDay(new Date(year, month, daysInMonth)).getTime();
  const todayKey = startOfDay(new Date()).getTime();

  // Build range "events" and assign each task to a global lane so overlapping
  // tasks never render on top of each other — they stack into separate rows
  // that stay aligned across every day of the month.
  const { laneByDay, maxLane } = useMemo(() => {
    const events = [];
    (tasks || []).forEach((t) => {
      const start = t.start_datetime ? startOfDay(t.start_datetime) : null;
      const deadline = t.deadline_datetime ? startOfDay(t.deadline_datetime) : null;
      if (!start && !deadline) return;
      const s = start || deadline;
      const e = deadline || start;
      const overdue =
        t.status === 'Overdue' ||
        (t.status !== 'Completed' && t.status !== 'Cancelled' && e.getTime() < todayKey);
      events.push({
        task: t,
        start: s,
        end: e,
        startKey: s.getTime(),
        endKey: e.getTime(),
        style: PRIORITY_STYLES[t.priority] || DEFAULT_STYLE,
        overdue,
      });
    });

    // Greedy interval scheduling → stable lane per task for the whole month.
    const sorted = [...events].sort((a, b) => a.startKey - b.startKey);
    const laneEnds = [];
    sorted.forEach((ev) => {
      let lane = laneEnds.findIndex((endKey) => endKey < ev.startKey);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(ev.endKey);
      } else {
        laneEnds[lane] = ev.endKey;
      }
      ev.lane = lane;
    });

    const byDay = {};
    sorted.forEach((ev) => {
      const s = Math.max(ev.startKey, monthStart);
      const e = Math.min(ev.endKey, monthEnd);
      for (let k = s; k <= e; k += DAY_MS) {
        (byDay[k] = byDay[k] || [])[ev.lane] = ev;
      }
    });

    return { laneByDay: byDay, maxLane: laneEnds.length };
  }, [tasks, monthStart, monthEnd, todayKey]);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            {PRIORITY_LEGEND.map((p) => (
              <span key={p.key} className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <span className={cn('h-2 w-2 rounded-full', p.dot)} />
                {p.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg-page)]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`blank-${idx}`}
                className="min-h-[104px] border-b border-r border-[var(--border)] bg-[var(--bg-page)]/40"
              />
            );
          }
          const key = day.getTime();
          const isToday = key === todayKey;
          const laneArr = laneByDay[key] || [];
          return (
            <div
              key={key}
              className={cn(
                'min-h-[104px] border-b border-r border-[var(--border)] p-1.5',
                isToday && 'bg-[var(--bg-subtle)]'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isToday ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {Array.from({ length: maxLane }).map((_, lane) => {
                  const ev = laneArr[lane];
                  if (!ev) return <div key={`sp-${lane}`} className="h-5" />;
                  const isFirstInView = key === Math.max(ev.startKey, monthStart);
                  const isLastInView = key === Math.min(ev.endKey, monthEnd);
                  const roundedLeft = isFirstInView && ev.startKey >= monthStart;
                  const roundedRight = isLastInView && ev.endKey <= monthEnd;
                  const continuedLeft = isFirstInView && ev.startKey < monthStart;
                  const continuedRight = isLastInView && ev.endKey > monthEnd;
                  const showTitle = isFirstInView;
                  const title = `${ev.task.title}\nStart: ${fmt(ev.start)} — Due: ${fmt(ev.end)}`;
                  return (
                    <button
                      key={`${ev.task.id}-${lane}`}
                      type="button"
                      onClick={() => onView?.(ev.task)}
                      title={title}
                      className={cn(
                        'flex h-5 -mx-1.5 items-center gap-1 px-1.5 text-[11px] font-medium',
                        ev.style,
                        roundedLeft && 'rounded-l-md border-l-4',
                        continuedLeft && 'border-l-4 border-dashed',
                        roundedRight && 'rounded-r-md',
                        ev.overdue && 'ring-1 ring-red-500'
                      )}
                    >
                      {continuedLeft && <span className="opacity-70">◀</span>}
                      {showTitle ? (
                        <span className="truncate">{ev.task.title}</span>
                      ) : (
                        <span className="truncate opacity-70">⋯</span>
                      )}
                      {continuedRight && <span className="opacity-70">▶</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
