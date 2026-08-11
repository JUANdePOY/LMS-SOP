import { useRef, useCallback } from "react";
import { BookOpen, PlayCircle, Users, CheckCircle2, BarChart3, UserPlus } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { useBookOpening } from "./BookOpeningTransition";
import { getDifficultyMeta, ProgressBar } from "../utils/courseVisuals";
import { resolveFileUrl } from "@/lib/fileUrl";

export default function CourseLibraryCard({ course, onClick, onAssign, myProgress }) {
  const cardRef = useRef(null);
  const { captureCardPosition } = useBookOpening(course.id);

  const handleClick = useCallback(() => {
    captureCardPosition(cardRef.current);
    onClick?.();
  }, [captureCardPosition, onClick]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const handleAssign = (e) => {
    e.stopPropagation();
    onAssign?.(course);
  };

  const enrollments = course.enrollment_count || course.enrollments_count || 0;
  const avgProgress = myProgress != null ? myProgress : (course.avg_progress || 0);
  const completed = course.completed_count || 0;
  const difficultyMeta = getDifficultyMeta(course.difficulty);
  const isEnrolled = myProgress != null;
  const isAdmin = Boolean(onAssign);

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-label={course.title ? `Open course ${course.title}` : "Open course"}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group flex cursor-pointer flex-col rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md hover:border-[rgba(242,92,5,0.25)] dark:hover:border-blue-800 transition-all duration-200 motion-reduce:transition-none overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
        {course.thumbnail_url ? (
          <img
            src={resolveFileUrl(course.thumbnail_url)}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen size={32} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          {course.category ? (
            <Badge variant="outline" className="bg-white/90 dark:bg-neutral-900/80 backdrop-blur">
              {course.category}
            </Badge>
          ) : (
            <span />
          )}
          <Badge variant={difficultyMeta.variant}>{difficultyMeta.label}</Badge>
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white dark:bg-neutral-800 p-2.5 shadow-lg">
              <PlayCircle size={22} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
            </div>
            {onAssign && (
              <button
                type="button"
                onClick={handleAssign}
                title="Assign to employees"
                aria-label={`Assign course ${course.title} to employees`}
                className="rounded-full bg-[var(--color-primary)] p-2.5 text-white shadow-lg hover-brand"
              >
                <UserPlus size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
          {course.title || "Untitled Course"}
        </h3>
        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-2 min-h-[2rem]">
          {course.description || "No description provided"}
        </p>

        {!isAdmin && (
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <BarChart3 size={12} />
                {isEnrolled ? "Your progress" : "Avg progress"}
              </span>
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{avgProgress}%</span>
            </div>
            <ProgressBar value={avgProgress} />
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5" title="Enrollments">
            <Users size={13} className="text-neutral-400" />
            {enrollments}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Completed">
            <CheckCircle2 size={13} className="text-neutral-400" />
            {completed}
          </span>
        </div>
      </div>
    </div>
  );
}
