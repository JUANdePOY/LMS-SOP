import { PlayCircle } from "lucide-react";
import { resolveFileUrl } from "@/lib/fileUrl";

export default function CourseCard({ course, onAction, actionLabel }) {
  return (
    <div className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden">
        {course.thumbnail_url ? (
          <img src={resolveFileUrl(course.thumbnail_url)} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center">
            <PlayCircle size={36} className="text-blue-400 dark:text-blue-500" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-full bg-white dark:bg-neutral-800 p-2.5 shadow-lg">
            <PlayCircle size={22} className="text-blue-600 dark:text-blue-300" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{course.title}</h3>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{course.description}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{course.status}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span>{course.category}</span>
        <span>{course.difficulty}</span>
      </div>
    </div>
  );
}
