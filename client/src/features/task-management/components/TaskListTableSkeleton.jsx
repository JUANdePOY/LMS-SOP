import { memo } from 'react';
import { TASK_TABLE_GRID_COLS, TASK_STATUS_ORDER } from '../constants/taskConstants';

const TaskListTableSkeleton = memo(function TaskListTableSkeleton({ count = 5 }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <div
            className="grid items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5"
              style={{ gridTemplateColumns: TASK_TABLE_GRID_COLS }}
          >
            <span />
            <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-14 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-14 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <span />
          </div>

          {TASK_STATUS_ORDER.map((status) => (
            <div key={status} className="border-b border-[var(--border)] last:border-b-0">
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-page)]">
                <div className="h-3 w-3 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="h-3 w-6 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
              </div>
              {Array.from({ length: Math.max(1, Math.floor(count / TASK_STATUS_ORDER.length)) }).map((_, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0 animate-pulse"
            style={{ gridTemplateColumns: TASK_TABLE_GRID_COLS }}
                >
                  <div className="h-3.5 w-3.5 rounded-[3px] border-2 border-neutral-200 dark:border-neutral-700 rotate-45" />
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                  <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-1.5 w-14 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <span />
                </div>
              ))}
              <div className="px-4 py-2 border-t border-[var(--border)]">
                <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default TaskListTableSkeleton;
