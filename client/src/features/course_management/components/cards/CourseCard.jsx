export default function CourseCard({ course, onAction, actionLabel }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm hover:shadow-md transition-shadow">
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
