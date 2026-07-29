import { useNavigate } from "react-router-dom";

export default function LessonList({ lessons, modules, onLessonClick, courseId }) {
  const navigate = useNavigate();

  if (!lessons || !lessons.length) {
    return <p className="text-sm text-neutral-500">No lessons yet.</p>;
  }

  const moduleMap = new Map();
  if (modules && Array.isArray(modules)) {
    for (const m of modules) moduleMap.set(m.id, m);
  }

  const grouped = new Map();
  for (const lesson of lessons) {
    const mid = lesson.moduleId || lesson.module_id;
    if (!grouped.has(mid)) grouped.set(mid, []);
    grouped.get(mid).push(lesson);
  }

  const orderedGroupIds = Array.from(grouped.keys()).sort((a, b) => {
    const mA = moduleMap.get(a);
    const mB = moduleMap.get(b);
    return (mA?.order ?? mA?.order_index ?? 0) - (mB?.order ?? mB?.order_index ?? 0);
  });

  const handleClick = (lesson) => {
    if (lesson.status === "locked") return;
    if (typeof onLessonClick === "function") {
      onLessonClick(lesson);
    } else {
      navigate(`/courses/view/${courseId}/lesson/${lesson.id}`);
    }
  };

  return (
    <div className="space-y-3">
      {orderedGroupIds.map((mid) => {
        const mod = moduleMap.get(mid);
        const modLessons = grouped.get(mid) || [];
        const moduleHasLocked = modLessons.some((l) => l.status === "locked");
        return (
          <div key={mid} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 overflow-hidden">
            <div className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold ${moduleHasLocked ? "bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" : "bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"}`}>
              <span>{mod?.title || `Module`}</span>
              {moduleHasLocked && (
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wide">Locked</span>
              )}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {modLessons.map((lesson) => {
                const isLocked = lesson.status === "locked";
                const isCompleted = lesson.status === "completed";
                return (
                  <button
                    key={lesson.id}
                    disabled={isLocked}
                    onClick={() => handleClick(lesson)}
                    className={`w-full text-left rounded-none border-0 px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                      isLocked
                        ? "text-gray-400 cursor-not-allowed dark:text-neutral-500"
                        : "hover:bg-blue-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        isCompleted ? "border-green-500 text-green-600 bg-green-50" :
                        isLocked ? "border-gray-300 text-gray-400" :
                        "border-blue-500 text-blue-600"
                      }`}>
                        {isCompleted ? "✓" : lesson.order}
                      </span>
                      <span className={isLocked ? "line-through opacity-70" : ""}>{lesson.title}</span>
                    </span>
                    <span className="text-xs text-neutral-400">{isLocked ? "Locked" : lesson.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
