import { BookOpen, PlayCircle, Users, CheckCircle2, ChevronRight, BarChart3 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { getDifficultyMeta, ProgressBar } from "../utils/courseVisuals";

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
      className="group cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 relative overflow-hidden">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt={course.title} className="h-full w-full rounded-md object-cover" />
          ) : (
            <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="rounded-full bg-white dark:bg-neutral-800 p-1.5 shadow-lg">
              <PlayCircle size={16} className="text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 transition-colors">
                {course.title || "Untitled Course"}
              </h3>
              <Badge variant={difficultyMeta.variant} className="shrink-0">{difficultyMeta.label}</Badge>
              {course.category && (
                <Badge variant="outline" className="shrink-0 hidden sm:inline-flex">{course.category}</Badge>
              )}
            </div>
            <ChevronRight size={14} className="text-neutral-400 group-hover:text-neutral-600 shrink-0" />
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1 mt-0.5">
            {course.description || "No description provided"}
          </p>

          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <BarChart3 size={10} />
                {avgProgress}% {isEnrolled ? "your progress" : "avg progress"}
              </span>
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Users size={10} />
                  {enrollments} enrolled
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  {completed} completed
                </span>
              </span>
            </div>
            <ProgressBar value={avgProgress} />
          </div>
        </div>
      </div>
    </div>
  );
}
