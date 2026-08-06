import { cn } from '@/lib/utils';

function TaskCardSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm",
            "animate-pulse"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div>
              <div className="flex gap-2 mt-2.5">
                <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded-full w-12"></div>
                <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded-full w-16"></div>
                <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded-full w-10"></div>
              </div>
            </div>
            {i % 2 === 0 && (
              <div className="flex gap-1.5 shrink-0">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-12"></div>
                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-12"></div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-8"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-12"></div>
            </div>
            {i % 2 === 0 && (
              <div className="flex gap-1.5 shrink-0">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-12"></div>
                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-12"></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export default TaskCardSkeleton;
