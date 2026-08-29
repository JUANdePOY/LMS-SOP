import { memo } from 'react';

const TaskListTableSkeleton = memo(function TaskListTableSkeleton({ count = 5 }) {
  const colTemplate = '36px minmax(220px,1.6fr) 170px 150px 120px 160px 90px 110px 150px 40px';
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[920px]">
        <div
          className="sticky top-0 z-20 grid items-center gap-3 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]"
          style={{ gridTemplateColumns: colTemplate }}
        >
          <span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="grid items-center gap-3 px-3 border-b border-[var(--border-subtle)] animate-pulse"
            style={{ gridTemplateColumns: colTemplate, minHeight: '54px' }}
          >
            <span className="h-4 w-4 rounded border border-[var(--border-subtle)]" />
            <div className="h-3.5 w-1/2 rounded bg-[var(--border-subtle)]" />
            <div className="h-3 w-24 rounded bg-[var(--border-subtle)]" />
            <div className="h-6 w-6 rounded-full bg-[var(--border-subtle)]" />
            <div className="h-3 w-16 rounded bg-[var(--border-subtle)]" />
            <div className="h-3 w-20 rounded bg-[var(--border-subtle)]" />
            <div className="h-3 w-10 rounded bg-[var(--border-subtle)]" />
            <div className="h-3 w-12 rounded bg-[var(--border-subtle)]" />
            <div className="h-[3px] w-full rounded-full bg-[var(--border-subtle)]" />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
});

export default TaskListTableSkeleton;
