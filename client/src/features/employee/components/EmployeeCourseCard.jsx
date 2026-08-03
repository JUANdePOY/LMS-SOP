import { BookOpen, PlayCircle, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  intermediate: { label: "Intermediate", color: "bg-amber-50 text-amber-700 border-amber-200" },
  advanced: { label: "Advanced", color: "bg-rose-50 text-rose-700 border-rose-200" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-sky-700 border-sky-200" },
};

export default function EmployeeCourseCard({ course, onClick, showProgress = false, progress = 0, enrollmentStatus = null }) {
  const difficulty = DIFFICULTY_META[course.difficulty] || DIFFICULTY_META.all_levels;
  const isCompleted = progress >= 100;
  const isEnrolled = enrollmentStatus === "active" || enrollmentStatus === "completed";

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      <div className="relative aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center">
            <BookOpen size={36} className="text-blue-400 dark:text-blue-500" />
          </div>
        )}
        {showProgress && progress > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            {Math.round(progress)}%
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-full bg-white dark:bg-neutral-800 p-2.5 shadow-lg">
            <PlayCircle size={22} className="text-blue-600 dark:text-blue-300" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            {course.title || "Untitled Course"}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
            {course.description || "No description available"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border", difficulty.color)}>
            {difficulty.label}
          </span>
          {course.category && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              {course.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          {course.lesson_count && (
            <div className="flex items-center gap-1">
              <BookOpen size={12} />
              <span>{course.lesson_count} lessons</span>
            </div>
          )}
          {course.duration_hours && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{course.duration_hours}h</span>
            </div>
          )}
          {course.enrollment_count && (
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{course.enrollment_count}</span>
            </div>
          )}
        </div>

        {course.instructor_name && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            by {course.instructor_name}
          </p>
        )}

        {showProgress && (
          <div className="space-y-2 pt-2.5 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">
                {isCompleted ? "Completed" : `${Math.round(progress)}% complete`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isCompleted ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
