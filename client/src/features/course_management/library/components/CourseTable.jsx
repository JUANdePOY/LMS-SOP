import { BookOpen, PlayCircle, Users, BarChart3, ChevronRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { getDifficultyMeta } from "../utils/courseVisuals";
import { resolveFileUrl } from "@/lib/fileUrl";

const COLUMNS = [
  { key: "title", label: "Course", align: "left" },
  { key: "difficulty", label: "Difficulty", align: "left", className: "hidden md:table-cell" },
  { key: "category", label: "Category", align: "left", className: "hidden lg:table-cell" },
  { key: "enrollments", label: "Enrolled", align: "right", className: "hidden sm:table-cell" },
  { key: "progress", label: "Progress", align: "left", className: "hidden sm:table-cell" },
  { key: "action", label: "", align: "right", className: "w-10" },
];

function CourseTableRow({ course, onClick, myProgress, showProgress }) {
  const enrollments = course.enrollment_count || course.enrollments_count || 0;
  const avgProgress = myProgress != null ? myProgress : course.avg_progress || 0;
  const difficultyMeta = getDifficultyMeta(course.difficulty);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-label={`Open course ${course.title || "Untitled Course"}`}
      onClick={() => onClick?.(course.id)}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
    >
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
            {course.thumbnail_url ? (
              <img
                src={resolveFileUrl(course.thumbnail_url)}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen size={18} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
              <PlayCircle size={14} className="text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-[var(--color-primary)] dark:group-hover:text-[var(--color-primary)] transition-colors">
              {course.title || "Untitled Course"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
              {course.description || "No description provided"}
            </p>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <Badge variant={difficultyMeta.variant}>{difficultyMeta.label}</Badge>
      </td>
      <td className="hidden px-3 py-3 lg:table-cell">
        {course.category ? (
          <Badge variant="outline">{course.category}</Badge>
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        )}
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <span className="inline-flex items-center justify-end gap-1 text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
          <Users size={12} />
          {enrollments}
        </span>
      </td>
      {showProgress && (
        <td className="hidden px-3 py-3 sm:table-cell">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className={`h-full rounded-full ${avgProgress >= 80 ? "bg-success-soft0" : avgProgress >= 50 ? "bg-[rgba(242,92,5,0.08)]0" : "bg-warning-soft0"}`}
                style={{ width: `${avgProgress}%` }}
              />
            </div>
            <span className="inline-flex items-center gap-1 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              <BarChart3 size={11} />
              {avgProgress}%
            </span>
          </div>
        </td>
      )}
      <td className="py-3 pl-3 pr-4 text-right">
        <ChevronRight size={16} className="ml-auto text-neutral-400 group-hover:text-neutral-600 transition-colors" />
      </td>
    </tr>
  );
}

export default function CourseTable({ courses, onRowClick, getProgress, showProgress = true }) {
  const columns = showProgress ? COLUMNS : COLUMNS.filter((c) => c.key !== "progress");
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/60">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ${col.align === "right" ? "text-right" : "text-left"} ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {courses.map((course) => (
            <CourseTableRow
              key={course.id}
              course={course}
              myProgress={getProgress ? getProgress(course) : course.myProgress}
              showProgress={showProgress}
              onClick={onRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
