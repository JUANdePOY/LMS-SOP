import { useState } from "react";
import LessonContentEditor from "./LessonContentEditor";

const LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "text", label: "Text / Reading" },
  { value: "link", label: "Link" },
  { value: "quiz", label: "Quiz" },
];

export default function LessonRow({ lesson, onUpdate, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const [editing, setEditing] = useState(false);

  const update = (patch) => {
    onUpdate?.({ ...lesson, ...patch });
  };

  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="text-neutral-400 disabled:opacity-30">↑</button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="text-neutral-400 disabled:opacity-30">↓</button>
        </div>
        <input
          value={lesson.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Lesson title"
          className="flex-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"
        />
        <select
          value={lesson.type || "text"}
          onChange={(e) => update({ type: e.target.value })}
          className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"
        >
          {LESSON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="button" onClick={() => setEditing((e) => !e)} className="text-xs rounded-md border border-neutral-200 dark:border-neutral-700 px-2 py-1">
          {editing ? "Hide" : "Edit"}
        </button>
        <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:text-red-700">Remove</button>
      </div>
      {editing && (
        <div className="mt-2">
          <LessonContentEditor lesson={lesson} onChange={update} onClose={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}
