import { BookOpen, PlayCircle, Users, CheckCircle2, ChevronRight, BarChart3 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { getDifficultyMeta, ProgressBar } from "../utils/courseVisuals";
import { resolveFileUrl } from "@/lib/fileUrl";

export default function CourseListRow({ course, onClick, myProgress }) {
  const enrollments = course.enrollment_count || course.enrollments_count || 0;
  const avgProgress = myProgress != null ? myProgress : (course.avg_progress || 0);
  const completed = course.completed_count || 0;
  const difficultyMeta = getDifficultyMeta(course.difficulty);
  const isEnrolled = myProgress != null;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={course.title ? `Open course ${course.title}` : "Open course"}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 hover:border-[rgba(242,92,5,0.25)] dark:hover:border-blue-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 sm:h-16 sm:w-16">
          {course.thumbnail_url ? (
            <img src={resolveFileUrl(course.thumbnail_url)} alt={course.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen size={20} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="rounded-full bg-white dark:bg-neutral-800 p-1.5 shadow-lg">
              <PlayCircle size={16} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-[var(--color-primary)] transition-colors">
                {course.title || "Untitled Course"}
              </h3>
              <Badge variant={difficultyMeta.variant} className="shrink-0">{difficultyMeta.label}</Badge>
              {course.category && (
                <Badge variant="outline" className="shrink-0 hidden md:inline-flex">{course.category}</Badge>
              )}
            </div>
            <ChevronRight size={16} className="shrink-0 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
          </div>

          <p className="mt-1 line-clamp-1 text-xs text-neutral-600 dark:text-neutral-400">
            {course.description || "No description provided"}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={avgProgress} />
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              <BarChart3 size={11} />
              {avgProgress}%
            </span>
            <span className="hidden items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 sm:inline-flex" title="Enrollments">
              <Users size={11} />
              {enrollments}
            </span>
            <span className="hidden items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 sm:inline-flex" title="Completed">
              <CheckCircle2 size={11} />
              {completed}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
