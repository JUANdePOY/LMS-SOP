import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
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

export default function TaskCalendar({ tasks, onView }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = {};
    const add = (key, entry) => {
      (map[key] = map[key] || []).push(entry);
    };
    (tasks || []).forEach((t) => {
      const start = t.start_datetime ? startOfDay(t.start_datetime) : null;
      const end = t.deadline_datetime ? startOfDay(t.deadline_datetime) : start;
      if (!start && !end) return;
      const s = start || end;
      const e = end || start;
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
      const startDate = s.getTime();
      const endDate = e.getTime();
      for (let k = startDate; k <= endDate; k += 86400000) {
        const phase = k === startDate ? 'start' : k === endDate ? 'end' : 'middle';
        add(k, { task: t, phase, days, start: s, end: e });
      }
    });
    return map;
  }, [tasks]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = startOfDay(new Date()).getTime();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
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

      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg-page)]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`blank-${idx}`} className="min-h-[96px] border-b border-r border-[var(--border)] bg-[var(--bg-page)]/40" />;
          const key = day.getTime();
          const dayTasks = byDay[key] || [];
          const overdue = dayTasks.some((t) => t.task.status === 'Overdue' || (t.task.status !== 'Completed' && t.task.status !== 'Cancelled' && key < todayKey && t.phase === 'end'));
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={cn(
                'min-h-[96px] border-b border-r border-[var(--border)] p-1.5',
                isToday && 'bg-[var(--bg-subtle)]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-medium', isToday ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]')}>
                  {day.getDate()}
                </span>
                {overdue && <AlertTriangle size={12} className="text-red-500" />}
              </div>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((entry, i) => {
                  const t = entry.task;
                  const title = `${t.title}\nStart: ${fmt(entry.start)} — Due: ${fmt(entry.end)}\nDuration: ${entry.days} day(s)`;
                  if (entry.phase === 'start') {
                    return (
                      <button
                        key={`${t.id}-${i}`}
                        type="button"
                        onClick={() => onView?.(t)}
                        title={title}
                        className="block w-full rounded border-l-2 border-green-500 bg-green-500/10 px-1.5 py-0.5 text-left"
                      >
                        <span className="block truncate text-[11px] font-medium text-[var(--text-primary)]">{t.title}</span>
                        <span className="block truncate text-[10px] text-[var(--text-muted)]">
                          {fmt(entry.start)} → {fmt(entry.end)} · {entry.days}d
                        </span>
                      </button>
                    );
                  }
                  if (entry.phase === 'end') {
                    return (
                      <button
                        key={`${t.id}-${i}`}
                        type="button"
                        onClick={() => onView?.(t)}
                        title={title}
                        className="block w-full truncate rounded border-r-2 border-orange-500 bg-orange-500/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-[var(--text-primary)]"
                      >
                        ⏲ {t.title}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={`${t.id}-${i}`}
                      type="button"
                      onClick={() => onView?.(t)}
                      title={title}
                      className="block w-full truncate rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-left text-[11px] text-[var(--text-secondary)]"
                    >
                      ⋯ {t.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <span className="block px-1.5 text-[11px] text-[var(--text-muted)]">+{dayTasks.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
