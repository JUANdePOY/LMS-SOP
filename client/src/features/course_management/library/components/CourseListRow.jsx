import { BookOpen, PlayCircle, Users, BarChart3, CheckCircle2, ChevronRight } from "lucide-react";

export default function CourseListRow({ course, onClick }) {
  const enrollments = course.enrollment_count || course.enrollments_count || 0;
  const avgProgress = course.avg_progress || 0;
  const completed = course.completed_count || 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
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
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 transition-colors">
              {course.title || "Untitled Course"}
            </h3>
            <ChevronRight size={14} className="text-neutral-400 group-hover:text-neutral-600 shrink-0" />
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1 mt-0.5">
            {course.description || "No description provided"}
          </p>

          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1">
              <Users size={10} />
              {enrollments} enrolled
            </span>
            <span className="inline-flex items-center gap-1">
              <BarChart3 size={10} />
              {avgProgress}% avg progress
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={10} />
              {completed} completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
