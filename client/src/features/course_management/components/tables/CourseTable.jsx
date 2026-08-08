import { useState } from "react";
import { ChevronRight, Users, Layers, BookOpen } from "lucide-react";
import { resolveFileUrl } from "@/lib/fileUrl";

const STATUS_META = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  draft: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-500/20 dark:text-neutral-300 dark:border-neutral-500/30",
  archived: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
};

const DIFFICULTY_META = {
  beginner: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  intermediate: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  advanced: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  all_levels: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
};

function StatusBadge({ status }) {
  const key = (status || "draft").toLowerCase();
  const cls = STATUS_META[key] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {status || "draft"}
    </span>
  );
}

function DifficultyBadge({ difficulty }) {
  const key = difficulty || "all_levels";
  const cls = DIFFICULTY_META[key] || DIFFICULTY_META.all_levels;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {difficulty?.replace(/_/g, " ") || "all levels"}
    </span>
  );
}

function SortHeader({ label, field, sortField, sortDirection, onSort, className = "" }) {
  const active = sortField === field;
  return (
    <th
      className={`text-left px-3 py-2.5 font-medium text-neutral-500 cursor-pointer select-none hover:text-blue-600 transition-colors ${className}`}
      onClick={() => onSort?.(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );
}

export default function CourseTable({
  courses,
  onEdit,
  onArchive,
  onDelete,
  onView,
  onReorder,
  sortField,
  sortDirection,
  onSort,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (from !== index && onReorder) {
      onReorder(from, index);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleRowActivate = (course) => {
    if (onView) onView(course);
  };

  const stop = (e) => e.stopPropagation();

  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <BookOpen size={24} className="text-neutral-400" />
        </div>
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No courses found</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Try adjusting your filters or create a new course.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-neutral-50/60 dark:bg-neutral-800/40">
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500 w-10">
              <span className="flex items-center" title="Drag to reorder">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              </span>
            </th>
            <SortHeader label="Title" field="title" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortHeader label="Category" field="category" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden md:table-cell" />
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500">Difficulty</th>
            <th className="text-left px-3 py-2.5 font-medium text-neutral-500">Status</th>
            <SortHeader label="Modules" field="module_count" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden lg:table-cell" />
            <SortHeader label="Enrollments" field="enrollment_count" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden lg:table-cell" />
            <th className="text-right px-3 py-2.5 font-medium text-neutral-500 w-10" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {courses.map((c, idx) => {
            const isDragging = dragIndex === idx;
            const isOver = overIndex === idx;
            return (
              <tr
                key={c.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                role="button"
                tabIndex={0}
                onClick={() => handleRowActivate(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowActivate(c);
                  }
                }}
                aria-label={`Open course ${c.title}`}
                className={`group border-b border-[var(--border)] last:border-0 outline-none transition-all duration-150 cursor-pointer
                  hover:bg-neutral-50 dark:hover:bg-neutral-800/50
                  focus-visible:bg-blue-50 dark:focus-visible:bg-blue-900/20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
                  ${isDragging ? "opacity-50 bg-blue-50 dark:bg-blue-900/20" : ""}
                  ${isOver ? "border-t-2 border-t-blue-400" : ""}`}
              >
                <td className="px-3 py-3">
                  <button
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                    onClick={stop}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                      {c.thumbnail_url ? (
                        <img src={resolveFileUrl(c.thumbnail_url)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpen size={16} className="text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {c.title}
                      </p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {c.instructor_name || c.category || "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-neutral-500 hidden md:table-cell">{c.category || "—"}</td>
                <td className="px-3 py-3"><DifficultyBadge difficulty={c.difficulty} /></td>
                <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                    <Layers size={13} className="text-neutral-400" />
                    {c.module_count ?? 0}
                  </span>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                    <Users size={13} className="text-neutral-400" />
                    {c.enrollment_count ?? 0}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1" onClick={stop}>
                    <button
                      onClick={() => onView?.(c)}
                      className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                      title="Open"
                      aria-label={`Open ${c.title}`}
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => onEdit?.(c)} className="rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-blue-600 dark:text-neutral-300 dark:hover:bg-neutral-800">Edit</button>
                    <button onClick={() => onArchive?.(c)} className="rounded-md px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10">Archive</button>
                    <button onClick={() => onDelete?.(c.id)} className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
