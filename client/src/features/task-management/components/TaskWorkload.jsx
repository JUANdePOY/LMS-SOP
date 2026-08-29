import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from '@/shared/components/ui/Avatar';

function assigneeKey(a) {
  return a.reference_id != null ? `${a.assignment_type}:${a.reference_id}` : `${a.assignment_type}:${a.reference_name}`;
}

export default function TaskWorkload({ tasks }) {
  const assignees = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      (t.assignments || []).forEach((a) => {
        const key = assigneeKey(a);
        if (!map.has(key)) {
          map.set(key, {
            key,
            name: a.reference_name || (a.assignment_type === 'Department' ? 'Department' : 'Unassigned'),
            type: a.assignment_type,
            avatar_url: a.avatar_url,
            tasks: [],
          });
        }
        map.get(key).tasks.push(t);
      });
    });

    const list = [...map.values()].map((x) => {
      const totalHours = x.tasks.reduce((s, t) => s + (Number(t.estimated_hours) || 0), 0);
      const completed = x.tasks.filter((t) => t.status === 'Completed').length;
      const overdue = x.tasks.filter((t) => t.status === 'Overdue').length;
      const avgProgress = x.tasks.length
        ? Math.round(x.tasks.reduce((s, t) => s + (Number(t.progress_rate) || 0), 0) / x.tasks.length)
        : 0;
      return { ...x, totalHours, completed, overdue, avgProgress, count: x.tasks.length };
    });

    const maxHours = Math.max(1, ...list.map((x) => x.totalHours));
    return list.sort((a, b) => b.totalHours - a.totalHours).map((x) => ({ ...x, pct: (x.totalHours / maxHours) * 100 }));
  }, [tasks]);

  if (assignees.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center">
        <Users size={28} className="mx-auto mb-3 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No assigned tasks to summarize.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3 border-b border-[var(--border)] bg-[var(--bg-page)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <span>Assignee</span>
        <span>Estimated Hours</span>
        <span>Tasks</span>
        <span className="text-right">Avg Progress</span>
      </div>
      {assignees.map((a) => (
        <div key={a.key} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
          <div className="flex items-center gap-2 min-w-0">
            {a.type === 'User' ? (
              <UserAvatar user={{ full_name: a.name, avatar_url: a.avatar_url }} size="sm" className="shrink-0" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {a.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{a.name}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{a.type}</p>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${a.pct}%` }} />
              </span>
              <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)] w-14 text-right">{a.totalHours}h</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-[var(--text-primary)]">{a.count}</span>
            {a.overdue > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/15">{a.overdue} overdue</span>
            )}
            {a.completed > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/15">{a.completed} done</span>
            )}
          </div>

          <div className="text-right">
            <span className={cn('text-sm font-semibold tabular-nums', a.avgProgress >= 100 ? 'text-emerald-600' : 'text-[var(--text-primary)]')}>
              {a.avgProgress}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
