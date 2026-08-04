import { useMemo } from "react";
import { ChevronLeft, BookOpen, Clock, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  intermediate: { label: "Intermediate", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  advanced: { label: "Advanced", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30" },
};

export default function CourseOverviewHero({
  course,
  onBack,
  primaryAction,
  secondaryAction,
  breadcrumb,
}) {
  const difficulty = useMemo(() => {
    if (!course?.difficulty) return DIFFICULTY_META.all_levels;
    return DIFFICULTY_META[course.difficulty] || DIFFICULTY_META.all_levels;
  }, [course?.difficulty]);

  return (
    <div className="w-full max-w-none">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 shadow-sm dark:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.30),rgba(147,51,234,0.08),transparent_75%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.15),rgba(168,85,247,0.12),transparent_45%)]" />
        <div className="relative px-5 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                <ChevronLeft size={14} />
                {breadcrumb || "Back to Library"}
              </button>
              {secondaryAction && (
                <div className="hidden sm:flex items-center gap-2">
                  {secondaryAction}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="relative h-40 sm:h-44 md:h-48 w-full md:w-64 shrink-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                {course?.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title || "Course cover"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <BookOpen size={32} className="text-blue-400 dark:text-blue-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
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

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-neutral-400 dark:text-neutral-500" />
                    <span>{course?.duration_hours || 0}h</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={13} className="text-neutral-400 dark:text-neutral-500" />
                    <span>{course?.lesson_count || 0} lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-neutral-400 dark:text-neutral-500" />
                    <span>{course?.enrollment_count || 0} students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe size={13} className="text-neutral-400 dark:text-neutral-500" />
                    <span>English</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                  {primaryAction && (
                    <div className="flex items-center gap-2">
                      {primaryAction}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
