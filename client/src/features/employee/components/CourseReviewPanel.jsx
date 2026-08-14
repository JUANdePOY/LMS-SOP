import { useState, useEffect, useMemo } from "react";
import { X, CheckCircle2, HelpCircle, Award, FileText, Video, BarChart3, RefreshCw } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { listAttempts } from "@/features/assessments/api/attempt.api";

const LESSON_TYPE_META = {
  reading: { label: "Reading", icon: FileText },
  video: { label: "Video", icon: Video },
  quiz: { label: "Quiz", icon: HelpCircle },
  assignment: { label: "Assignment", icon: Award },
  document: { label: "Document", icon: FileText },
  sop: { label: "SOP", icon: FileText },
  certificate: { label: "Certificate", icon: Award },
  link: { label: "Link", icon: FileText },
  presentation: { label: "Presentation", icon: FileText },
  downloadable: { label: "Download", icon: FileText },
  live_session: { label: "Live Session", icon: Video },
  interactive: { label: "Interactive", icon: FileText },
};

export default function CourseReviewPanel({ open, onClose, courseId, modules = [], lessons, onSelectLesson }) {
  const [attempts, setAttempts] = useState({});
  const [loadingScores, setLoadingScores] = useState(false);

  const completedLessons = useMemo(
    () => (lessons || []).filter((l) => l.status === "completed"),
    [lessons]
  );

  const moduleMap = useMemo(() => {
    const map = new Map();
    for (const m of modules || []) map.set(m.id, m);
    return map;
  }, [modules]);

  const groupedByModule = useMemo(() => {
    const groups = new Map();
    for (const lesson of completedLessons) {
      const mid = lesson.moduleId || lesson.module_id || "uncategorized";
      if (!groups.has(mid)) groups.set(mid, []);
      groups.get(mid).push(lesson);
    }
    const ordered = Array.from(groups.entries()).sort((a, b) => {
      const mA = moduleMap.get(a[0]);
      const mB = moduleMap.get(b[0]);
      return (mA?.order ?? mA?.order_index ?? 0) - (mB?.order ?? mB?.order_index ?? 0);
    });
    return ordered.map(([mid, modLessons]) => ({
      module: mid === "uncategorized" ? null : moduleMap.get(mid),
      lessons: [...modLessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));
  }, [completedLessons, moduleMap]);

  const quizLessons = useMemo(
    () => completedLessons.filter((l) => l.type === "quiz" && (l.quizId || l.quiz_id)),
    [completedLessons]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadScores() {
      if (!quizLessons.length) {
        setAttempts({});
        return;
      }
      setLoadingScores(true);
      const result = {};
      await Promise.all(
        quizLessons.map(async (lesson) => {
          const quizId = lesson.quizId || lesson.quiz_id;
          try {
            const res = await listAttempts({ quizId });
            const rows = Array.isArray(res?.data) ? res.data : [];
            result[lesson.id] = rows.length
              ? [...rows].sort((a, b) => (b.attempt_number || 0) - (a.attempt_number || 0))[0]
              : null;
          } catch {
            result[lesson.id] = null;
          }
        })
      );
      if (!cancelled) {
        setAttempts(result);
        setLoadingScores(false);
      }
    }

    loadScores();
    return () => {
      cancelled = true;
    };
  }, [open, quizLessons]);

  const renderLessonRow = (lesson) => {
    const meta = LESSON_TYPE_META[lesson.type] || LESSON_TYPE_META.reading;
    const Icon = meta.icon;
    const attempt = attempts[lesson.id];
    return (
      <li key={lesson.id}>
        <button
          onClick={() => onSelectLesson?.(lesson)}
          className="w-full flex items-center justify-between gap-3 px-2 py-3 text-left rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10 text-green-600">
              <Icon size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                {lesson.title}
              </span>
              <span className="block text-xs text-neutral-400">{meta.label}</span>
            </span>
          </span>

          <span className="flex items-center gap-3 shrink-0">
            {lesson.type === "quiz" && (
              <>
                {loadingScores ? (
                  <RefreshCw size={14} className="animate-spin text-neutral-400" />
                ) : attempt ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      attempt.passed
                        ? "bg-success-soft text-[var(--color-success)]"
                        : "bg-danger-soft text-[var(--color-danger)]"
                    }`}
                  >
                    <BarChart3 size={12} />
                    {attempt.percentage != null ? `${attempt.percentage}%` : `${attempt.score}/${attempt.max_score}`}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">—</span>
                )}
              </>
            )}
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
          </span>
        </button>
      </li>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Review Completed Lessons" size="2xl">
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
        Revisit any lesson you have completed to refresh your knowledge.
      </p>

      {completedLessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 py-10 text-center">
          <CheckCircle2 size={28} className="text-neutral-400" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">No completed lessons yet</p>
          <p className="text-xs text-neutral-400">Complete lessons to review them here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByModule.map(({ module, lessons: modLessons }) => (
            <div key={module?.id || "uncategorized"}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1 px-2">
                {module?.title || "Lessons"}
              </h3>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                {modLessons.map(renderLessonRow)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
