import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText, Video, HelpCircle, ClipboardCheck, ExternalLink, File, Clock, Award } from "lucide-react";

const LESSON_TYPE_META = {
  reading: { label: "Reading", icon: FileText, color: "text-[var(--color-primary)]" },
  video: { label: "Video", icon: Video, color: "text-[var(--color-secondary)]" },
  quiz: { label: "Quiz", icon: HelpCircle, color: "text-[var(--color-warning)]" },
  assignment: { label: "Assignment", icon: ClipboardCheck, color: "text-[var(--color-danger)]" },
  document: { label: "Document", icon: File, color: "text-[var(--color-success)]" },
  sop: { label: "SOP", icon: FileText, color: "text-[var(--color-secondary)]" },
  certificate: { label: "Certificate", icon: Award, color: "text-[var(--color-success)]" },
  link: { label: "Link", icon: ExternalLink, color: "text-cyan-500" },
  presentation: { label: "Presentation", icon: FileText, color: "text-[var(--color-secondary)]" },
  downloadable: { label: "Download", icon: File, color: "text-orange-500" },
  live_session: { label: "Live Session", icon: Video, color: "text-red-500" },
  interactive: { label: "Interactive", icon: FileText, color: "text-lime-500" },
};

export default function LessonList({ lessons, modules, onLessonClick, courseId }) {
  const navigate = useNavigate();
  const [expandedModules, setExpandedModules] = useState(() => {
    if (!lessons || !lessons.length) return new Set();
    const firstModuleId = lessons[0]?.moduleId || lessons[0]?.module_id;
    return firstModuleId ? new Set([firstModuleId]) : new Set();
  });

  const moduleMap = useMemo(() => {
    const map = new Map();
    if (modules && Array.isArray(modules)) {
      for (const m of modules) map.set(m.id, m);
    }
    return map;
  }, [modules]);

  const grouped = useMemo(() => {
    const map = new Map();
    if (!lessons || !lessons.length) return map;
    for (const lesson of lessons) {
      const mid = lesson.moduleId || lesson.module_id;
      if (!map.has(mid)) map.set(mid, []);
      map.get(mid).push(lesson);
    }
    return map;
  }, [lessons]);

  const orderedGroupIds = useMemo(() => {
    return Array.from(grouped.keys()).sort((a, b) => {
      const mA = moduleMap.get(a);
      const mB = moduleMap.get(b);
      return (mA?.order ?? mA?.order_index ?? 0) - (mB?.order ?? mB?.order_index ?? 0);
    });
  }, [grouped, moduleMap]);

  const moduleStats = useMemo(() => {
    const stats = new Map();
    for (const [mid, modLessons] of grouped.entries()) {
      const completed = modLessons.filter((l) => l.status === "completed").length;
      const totalDuration = modLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
      stats.set(mid, {
        completed,
        total: modLessons.length,
        duration: totalDuration,
      });
    }
    return stats;
  }, [grouped]);

  if (!grouped.size) {
    return <p className="text-sm text-neutral-500">No lessons yet.</p>;
  }

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleClick = (lesson) => {
    if (lesson.status === "locked") return;
    if (typeof onLessonClick === "function") {
      onLessonClick(lesson);
    } else {
      navigate(`/courses/view/${courseId}/lesson/${lesson.id}`);
    }
  };

  return (
    <div className="space-y-2">
      {orderedGroupIds.map((mid) => {
        const mod = moduleMap.get(mid);
        const modLessons = grouped.get(mid) || [];
        const moduleHasLocked = modLessons.some((l) => l.status === "locked");
        const isExpanded = expandedModules.has(mid);
        const stats = moduleStats.get(mid) || { completed: 0, total: 0, duration: 0 };

        return (
          <div key={mid} className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
            <div
              className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              onClick={() => toggleModule(mid)}
            >
              <div className="flex items-center gap-2.5">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className={`text-sm font-semibold ${moduleHasLocked ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-800 dark:text-neutral-200"}`}>
                  {mod?.title || "Module"}
                </span>
                {mod?.description && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
                    {mod.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                {stats.duration > 0 && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <Clock size={12} />
                    {stats.duration} min
                  </span>
                )}
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {stats.completed}/{stats.total}
                </span>
                {moduleHasLocked && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                    Locked
                  </span>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {modLessons.map((lesson) => {
                  const isLocked = lesson.status === "locked";
                  const isCompleted = lesson.status === "completed";
                  const isInProgress = lesson.status === "in_progress";
                  const lessonMeta = LESSON_TYPE_META[lesson.type || ""] || LESSON_TYPE_META.reading;
                  const LessonIcon = lessonMeta.icon;

                  return (
                    <button
                      key={lesson.id}
                      disabled={isLocked}
                      onClick={() => handleClick(lesson)}
                      className={`w-full text-left rounded-none border-0 px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${
                        isLocked
                          ? "text-neutral-400 cursor-not-allowed"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                            isCompleted
                              ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-500/10"
                              : isInProgress
                              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[rgba(242,92,5,0.08)] dark:bg-[rgba(242,92,5,0.16)]"
                              : isLocked
                              ? "border-neutral-300 text-neutral-400"
                              : "border-neutral-300 text-neutral-500"
                          }`}
                        >
                          {isCompleted ? "✓" : <LessonIcon size={10} className={lessonMeta.color} />}
                        </span>
                        <span className={isLocked ? "line-through opacity-60" : ""}>
                          {lesson.title}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                        <LessonIcon size={10} className={lessonMeta.color} />
                        <span>{lessonMeta.label}</span>
                        {lesson.duration && (
                          <span className="text-neutral-400">• {lesson.duration} min</span>
                        )}
                        {isInProgress && (
                          <span className="text-xs text-[var(--color-primary)] font-medium">In Progress</span>
                        )}
                        {isLocked && <span className="text-neutral-400">Locked</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
