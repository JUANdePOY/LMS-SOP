import { useMemo } from "react";
import { ChevronLeft, BookOpen, Clock, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveFileUrl } from "@/lib/fileUrl";

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-success-soft text-[var(--color-success)] border-emerald-200 dark:bg-success-soft0/10 dark:text-[var(--color-success)] dark:border-emerald-500/30" },
  intermediate: { label: "Intermediate", color: "bg-warning-soft text-[var(--color-warning)] border-[rgba(217,163,0,0.25)] dark:bg-warning-soft0/10 dark:text-[var(--color-warning)] dark:border-amber-500/30" },
  advanced: { label: "Advanced", color: "bg-danger-soft text-rose-700 border-[rgba(204,31,31,0.25)] dark:bg-danger-soft0/10 dark:text-[var(--color-danger)] dark:border-rose-500/30" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-[var(--color-primary)] border-[rgba(242,92,5,0.25)] dark:bg-[var(--color-primary)]/10 dark:text-[var(--color-primary)] dark:border-sky-500/30" },
};

function MetaStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <Icon size={13} className="text-neutral-400 dark:text-neutral-500" />
      <span>{value}</span>
    </div>
  );
}

export default function CourseOverviewHero({
  course,
  onBack,
  primaryAction,
  secondaryAction,
  breadcrumb,
  progress,
  progressLabel = "Your progress",
}) {
  const difficulty = useMemo(() => {
    if (!course?.difficulty) return DIFFICULTY_META.all_levels;
    return DIFFICULTY_META[course.difficulty] || DIFFICULTY_META.all_levels;
  }, [course?.difficulty]);

  const hasProgress = typeof progress === "number" && progress >= 0;

  return (
    <div className="w-full max-w-none">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative px-5 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onBack}
                className="group inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                {breadcrumb || "Back to Library"}
              </button>
              {secondaryAction && (
                <div className="hidden sm:flex items-center gap-2">
                  {secondaryAction}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
              <div className="relative h-40 w-full sm:h-44 sm:w-40 md:h-48 md:w-64 shrink-0 rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 shadow-sm ring-1 ring-inset ring-white/40 dark:ring-white/5">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/5 to-transparent dark:from-white/10" />
                {course?.thumbnail_url ? (
                  <img
                    src={resolveFileUrl(course.thumbnail_url)}
                    alt={course.title || "Course cover"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgba(242,92,5,0.06)] to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <BookOpen size={32} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border", difficulty.color)}>
                    {difficulty.label}
                  </span>
                  {course?.category && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {course.category}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                  {course?.title || "Course Details"}
                </h1>

                {course?.instructor_name && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">by {course.instructor_name}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <MetaStat icon={Clock} value={`${course?.duration_hours || 0}h`} label="Duration" />
                  <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                  <MetaStat icon={BookOpen} value={`${course?.lesson_count || 0} lessons`} label="Lessons" />
                  <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                  <MetaStat icon={Users} value={`${course?.enrollment_count || 0} students`} label="Students" />
                  <span className="hidden sm:block h-3 w-px bg-neutral-200 dark:bg-neutral-700" />
                  <MetaStat icon={Globe} value="English" label="Language" />
                </div>

                {hasProgress && (
                  <div className="pt-1">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span className="font-medium text-neutral-600 dark:text-neutral-300">Your progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] dark:bg-blue-400 transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                      />
                    </div>
                  </div>
                )}

                {primaryAction && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                    <div className="flex items-center gap-2">{primaryAction}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
