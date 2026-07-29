import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, PlayCircle, HelpCircle, Link2, Plus } from "lucide-react";

const TYPE_CONFIG = {
  video: { icon: PlayCircle, label: "Video" },
  text: { icon: FileText, label: "Text" },
  quiz: { icon: HelpCircle, label: "Quiz" },
  link: { icon: Link2, label: "Link" },
};

export default function CourseOutline({
  modules,
  selectedModuleId,
  selectedLessonId,
  onSelectModule,
  onSelectLesson,
  onAddModule,
  onUpdateModule,
  onRemoveModule,
  onAddLesson,
  onUpdateLesson,
  onRemoveLesson,
  onMoveLessonUp,
  onMoveLessonDown,
}) {
  return (
    <div className="flex h-full flex-col border-r border-[var(--border)] bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Course Outline</span>
        <button
          type="button"
          onClick={onAddModule}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-neutral-700 px-2 py-1 text-xs hover:border-neutral-300"
        >
          <Plus size={14} /> Module
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {modules.map((mod, idx) => (
          <ModuleOutlineItem
            key={mod.id || idx}
            module={mod}
            index={idx}
            selected={selectedModuleId === mod.id}
            selectedLessonId={selectedLessonId}
            onSelectModule={() => onSelectModule?.(mod.id)}
            onSelectLesson={(lessonId) => onSelectLesson?.(mod.id, lessonId)}
            onUpdate={(patch) => onUpdateModule?.(mod.id, patch)}
            onRemove={() => onRemoveModule?.(mod.id)}
            onAddLesson={() => onAddLesson?.(mod.id)}
            onUpdateLesson={onUpdateLesson}
            onRemoveLesson={onRemoveLesson}
            onMoveLessonUp={onMoveLessonUp}
            onMoveLessonDown={onMoveLessonDown}
          />
        ))}
        {modules.length === 0 && (
          <p className="text-xs text-neutral-500 px-1">No modules yet.</p>
        )}
      </div>
    </div>
  );
}

function ModuleOutlineItem({
  module,
  index,
  selected,
  selectedLessonId,
  onSelectModule,
  onSelectLesson,
  onUpdate,
  onRemove,
  onAddLesson,
  onUpdateLesson,
  onRemoveLesson,
  onMoveLessonUp,
  onMoveLessonDown,
}) {
  const [open, setOpen] = useState(true);
  const lessons = module.lessons || [];
  const hasLessons = lessons.length > 0;

  return (
    <div className={`rounded-md border ${selected ? "border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/10" : "border-transparent"}`}>
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-neutral-500 hover:text-neutral-700"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          type="button"
          onClick={onSelectModule}
          className={`flex-1 truncate text-left text-xs font-medium ${selected ? "text-blue-700 dark:text-blue-300" : "text-neutral-800 dark:text-neutral-200"}`}
          title={module.title || `Module ${index + 1}`}
        >
          {module.title || `Module ${index + 1}`}
        </button>
        <span className={`text-[10px] ${hasLessons ? "text-neutral-500" : "text-amber-600 dark:text-amber-400 font-medium"}`}>
          {hasLessons ? `${lessons.length} lesson${lessons.length === 1 ? "" : "s"}` : "No lessons yet"}
        </span>
        <button type="button" onClick={onRemove} className="text-neutral-400 hover:text-red-600 px-1">×</button>
      </div>
      {open && (
        <div className="border-t border-[var(--border)] px-1.5 py-1 space-y-0.5">
          {lessons.map((lesson, lIdx) => {
            const cfg = TYPE_CONFIG[lesson.type] || TYPE_CONFIG.text;
            const Icon = cfg.icon;
            const isSelected = selectedLessonId === lesson.id;
            return (
              <div
                key={lesson.id || lIdx}
                className={`flex items-center gap-1 rounded px-1.5 py-1 ${isSelected ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
              >
                <div className="flex flex-col">
                  <button type="button" onClick={() => onMoveLessonUp?.(module.id, lIdx)} disabled={lIdx === 0} className="text-neutral-400 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => onMoveLessonDown?.(module.id, lIdx)} disabled={lIdx === lessons.length - 1} className="text-neutral-400 disabled:opacity-30">↓</button>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectLesson?.(lesson.id)}
                  className={`flex-1 flex items-center gap-1.5 truncate text-left text-xs ${isSelected ? "text-blue-800 dark:text-blue-200 font-medium" : "text-neutral-700 dark:text-neutral-300"}`}
                  title={`${cfg.label}: ${lesson.title || `Lesson ${lIdx + 1}`}`}
                >
                  <Icon size={12} className="shrink-0" />
                  <span className="truncate">{lesson.title || `Lesson ${lIdx + 1}`}</span>
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onAddLesson}
            className="w-full rounded border border-dashed border-neutral-300 dark:border-neutral-600 py-1 text-[10px] text-neutral-600 dark:text-neutral-300 hover:border-neutral-400"
          >
            + Add Lesson
          </button>
        </div>
      )}
    </div>
  );
}
