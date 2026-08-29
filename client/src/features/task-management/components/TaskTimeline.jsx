import { useMemo } from 'react';
import { formatDate } from '../utils/taskDateUtils';
import { cn } from '@/lib/utils';

const STATUS_BAR = {
  Pending: 'bg-slate-400',
  'In Progress': 'bg-blue-500',
  Completed: 'bg-emerald-500',
  Overdue: 'bg-red-500',
  Cancelled: 'bg-neutral-400',
};

const DAY = 24 * 60 * 60 * 1000;

function parse(d) {
  return d ? new Date(d).getTime() : null;
}

export default function TaskTimeline({ tasks, onView }) {
  const rows = useMemo(() => {
    return (tasks || [])
      .map((t) => {
        const start = parse(t.start_datetime);
        const end = parse(t.deadline_datetime);
        if (start == null && end == null) return null;
        const s = start ?? end;
        const e = end ?? start;
        return { task: t, start: s, end: e };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
  }, [tasks]);

  const domain = useMemo(() => {
    if (rows.length === 0) return null;
    let min = Math.min(...rows.map((r) => r.start));
    let max = Math.max(...rows.map((r) => r.end));
    min -= 2 * DAY;
    max += 2 * DAY;
    return { min, max, total: Math.max(max - min, DAY) };
  }, [rows]);

  const months = useMemo(() => {
    if (!domain) return [];
    const out = [];
    const cur = new Date(domain.min);
    cur.setDate(1);
    while (cur.getTime() <= domain.max) {
      const mStart = cur.getTime();
      out.push({
        label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        left: ((mStart - domain.min) / domain.total) * 100,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }, [domain]);

  const todayLeft = domain
    ? ((Date.now() - domain.min) / domain.total) * 100
    : 0;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">No tasks with scheduled dates to display.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Month header */}
          <div className="relative h-7 border-b border-[var(--border)] bg-[var(--bg-page)]">
            {months.map((m, i) => (
              <span
                key={i}
                className="absolute top-1.5 text-[11px] font-medium text-[var(--text-muted)] border-l border-[var(--border)] pl-1.5"
                style={{ left: `${m.left}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Today marker */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-red-400/70"
              style={{ left: `calc(220px + (100% - 220px) * ${todayLeft / 100})` }}
            />
            {rows.map(({ task, start, end }) => {
              const left = ((start - domain.min) / domain.total) * 100;
              const width = Math.max(((end - start) / domain.total) * 100, 2);
              return (
                <div key={task.id} className="flex items-stretch border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)]">
                  <button
                    type="button"
                    onClick={() => onView?.(task)}
                    className="w-[220px] shrink-0 truncate px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] hover:text-[var(--color-primary)]"
                  >
                    {task.title}
                  </button>
                  <div className="relative flex-1">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-white shadow-sm"
                      style={{ left: `${left}%`, width: `calc(${width}% - 4px)`, backgroundColor: 'rgb(59 130 246)' }}
                      title={`${task.title} · ${formatDate(task.start_datetime)} → ${formatDate(task.deadline_datetime)}`}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_BAR[task.status] || 'bg-slate-400')} />
                      <span className="truncate">{task.progress_rate != null ? `${task.progress_rate}%` : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
