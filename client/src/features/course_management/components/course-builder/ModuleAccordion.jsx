import { useState } from "react";
import LessonRow from "./LessonRow";

export default function ModuleAccordion({ module, modulesCount, onUpdate, onRemove, onAddLesson, onUpdateLesson, onRemoveLesson, onMoveLessonUp, onMoveLessonDown }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(module.title || "");
  const lessons = module.lessons || [];

  const updateTitle = () => {
    onUpdate?.({ ...module, title });
  };

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="flex items-center gap-2 p-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-neutral-500">
          {open ? "▼" : "▶"}
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={updateTitle}
          placeholder={`Module ${modulesCount + 1}`}
          className="flex-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm font-medium"
        />
        <span className="text-xs text-neutral-500">#{modulesCount + 1}</span>
        <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:text-red-700">Delete</button>
      </div>
      {open && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 p-2 space-y-2">
          {lessons.map((lesson, idx) => (
            <LessonRow
              key={lesson.id || idx}
              lesson={lesson}
              onUpdate={(patch) => onUpdateLesson?.(module.id, idx, patch)}
              onRemove={() => onRemoveLesson?.(module.id, idx)}
              onMoveUp={() => onMoveLessonUp?.(idx)}
              onMoveDown={() => onMoveLessonDown?.(idx)}
              canMoveUp={idx > 0}
              canMoveDown={idx < lessons.length - 1}
            />
          ))}
          <button type="button" onClick={onAddLesson} className="w-full rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:border-neutral-400">
            + Add Lesson
          </button>
        </div>
      )}
    </div>
  );
}
