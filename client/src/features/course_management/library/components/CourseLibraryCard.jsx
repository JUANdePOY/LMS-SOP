import { BookOpen, Users, Clock, Star } from "lucide-react";

const STATUS_META = {
  published: {
    label: "Published",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  draft: {
    label: "Draft",
    chip: "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-200 border-neutral-200 dark:border-neutral-500/30",
    dot: "bg-neutral-400",
  },
  archived: {
    label: "Archived",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500",
  },
};

const DIFFICULTY_META = {
  beginner: { label: "Beginner", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-100 border-emerald-200 dark:border-emerald-500/30" },
  intermediate: { label: "Intermediate", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-100 border-amber-200 dark:border-amber-500/30" },
  advanced: { label: "Advanced", color: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-100 border-rose-200 dark:border-rose-500/30" },
  all_levels: { label: "All Levels", color: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100 border-sky-200 dark:border-sky-500/30" },
};

function formatDate(date) {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function CourseLibraryCard({ course, onClick }) {
  const statusKey = course.status || "draft";
  const status = STATUS_META[statusKey] || STATUS_META.draft;
  const difficulty = DIFFICULTY_META[course.difficulty] || DIFFICULTY_META.beginner;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <BookOpen size={32} className="text-blue-600 dark:text-blue-400" />
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {course.title || "Untitled Course"}
          </h3>
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${status.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`}></span>
            {status.label}
          </span>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 min-h-[2.5rem]">
          {course.description || "No description provided"}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {course.category && (
            <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
              {course.category}
            </span>
          )}
          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${difficulty.color}`}>
            {difficulty.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users size={12} />
              {course.enrollment_count || course.enrollments_count || 0}
            </span>
            {course.start_date && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {formatDate(course.start_date)}
              </span>
            )}
          </div>
          {course.avg_rating && (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star size={12} fill="currentColor" />
              {course.avg_rating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
