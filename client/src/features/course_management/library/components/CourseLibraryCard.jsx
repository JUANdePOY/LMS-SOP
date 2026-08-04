import { useRef, useCallback } from "react";
import { BookOpen, PlayCircle, Users, BarChart3, CheckCircle2 } from "lucide-react";
import { useBookOpening } from "./BookOpeningTransition";

export default function CourseLibraryCard({ course, onClick }) {
  const cardRef = useRef(null);
  const { captureCardPosition } = useBookOpening(course.id);

  const handleClick = useCallback(() => {
    captureCardPosition(cardRef.current);
    onClick?.();
  }, [captureCardPosition, onClick]);

  const enrollments = course.enrollment_count || course.enrollments_count || 0;
  const avgProgress = course.avg_progress || 0;
  const completed = course.completed_count || 0;

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className="group cursor-pointer rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden relative">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <BookOpen size={32} className="text-blue-600 dark:text-blue-400" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-full bg-white dark:bg-neutral-800 p-2.5 shadow-lg">
            <PlayCircle size={22} className="text-blue-600 dark:text-blue-300" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {course.title || "Untitled Course"}
        </h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 min-h-[2.5rem]">
          {course.description || "No description provided"}
        </p>

        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users size={12} />
              {enrollments}
            </span>
            <span className="inline-flex items-center gap-1">
              <BarChart3 size={12} />
              {avgProgress}%
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={12} />
              {completed}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
