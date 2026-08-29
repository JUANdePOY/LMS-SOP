import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_STATUSES, STATUS_STYLES } from '../constants/taskConstants';
import StatusDot from './StatusDot';

const HEALTH = {
  on_track: { label: 'On Track', cls: 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15' },
  at_risk: { label: 'At Risk', cls: 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15' },
  completed: { label: 'Completed', cls: 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15' },
};

export default function TaskPortfolio({ tasks, projectsById }) {
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const pid = t.project_id != null ? String(t.project_id) : '__none__';
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(t);
    });

    return [...map.entries()].map(([pid, groupTasks]) => {
      const project = pid === '__none__' ? null : projectsById?.[pid];
      const total = groupTasks.length;
      const completed = groupTasks.filter((t) => t.status === 'Completed').length;
      const overdue = groupTasks.filter((t) => t.status === 'Overdue').length;
      const avgProgress = total
        ? Math.round(groupTasks.reduce((s, t) => s + (Number(t.progress_rate) || 0), 0) / total)
        : 0;

      let health = 'on_track';
      if (overdue > 0) health = 'at_risk';
      else if (total > 0 && completed === total) health = 'completed';

      const counts = {};
      TASK_STATUSES.forEach((s) => { counts[s] = 0; });
      groupTasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });

      return {
        pid,
        project,
        name: project?.name || 'Unassigned',
        color: project?.color,
        status: project?.status,
        total,
        completed,
        overdue,
        avgProgress,
        health,
        counts,
      };
    }).sort((a, b) => b.total - a.total);
  }, [tasks, projectsById]);

  const openProject = (g) => {
    const p = g.project;
    if (!p) return;
    navigate(`/clients/${p.client_id}/businesses/${p.client_business_id}/projects/${p.id}`);
  };

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center">
        <FolderKanban size={28} className="mx-auto mb-3 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No projects to summarize.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const h = HEALTH[g.health];
        return (
          <div
            key={g.pid}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => openProject(g)}
                disabled={!g.project}
                className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
              >
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: g.color || 'var(--color-primary)' }} />
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{g.name}</span>
                {g.status && <StatusDot status={g.status} />}
                {g.project && <ChevronRight size={14} className="text-[var(--text-muted)]" />}
              </button>
              <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', h.cls)}>
                {g.health === 'at_risk' && <AlertTriangle size={11} />}
                {g.health === 'completed' && <CheckCircle2 size={11} />}
                {h.label}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <span
                  className={cn('block h-full rounded-full', g.avgProgress >= 100 ? 'bg-emerald-500' : 'bg-[var(--color-primary)]')}
                  style={{ width: `${g.avgProgress}%` }}
                />
              </span>
              <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)] w-10 text-right">{g.avgProgress}%</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
              <span><span className="font-semibold text-[var(--text-primary)]">{g.total}</span> tasks</span>
              <span><span className="font-semibold text-emerald-600">{g.completed}</span> completed</span>
              {g.overdue > 0 && <span className="font-semibold text-red-600">{g.overdue} overdue</span>}
              <div className="ml-auto flex items-center gap-1">
                {TASK_STATUSES.map((s) =>
                  g.counts[s] > 0 ? (
                    <span
                      key={s}
                      title={`${s}: ${g.counts[s]}`}
                      className={cn('h-2 w-6 rounded-sm', STATUS_STYLES[s]?.split(' ').find((c) => c.startsWith('bg-')) || 'bg-neutral-300')}
                    />
                  ) : null
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
