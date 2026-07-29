import { useState } from "react";

const LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "text", label: "Text / Reading" },
  { value: "link", label: "Link" },
  { value: "quiz", label: "Quiz" },
];

export default function LessonContentEditor({ lesson, onChange, onClose }) {
  const [local, setLocal] = useState({
    title: lesson?.title || "",
    type: lesson?.type || "text",
    content: lesson?.description || lesson?.content || "",
    url: lesson?.url || lesson?.content || "",
    duration: lesson?.duration || "",
    requiresQuizPass: !!lesson?.requiresQuizPass,
    passingScore: lesson?.passingScore || "",
    isRequired: lesson?.is_required ?? true,
  });

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange?.(next);
  };

  const isQuiz = local.type === "quiz";

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Lesson Content</span>
        {typeof onClose === "function" && (
          <button type="button" onClick={onClose} className="text-xs text-neutral-500 hover:text-neutral-700">Close</button>
        )}
      </div>
      <input
        value={local.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Lesson title"
        className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
      />
      <select
        value={local.type}
        onChange={(e) => update({ type: e.target.value })}
        className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
      >
        {LESSON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {!isQuiz ? (
        <textarea
          value={local.content}
          onChange={(e) => update({ content: e.target.value, url: e.target.value })}
          placeholder="Lesson text content or video URL"
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
          rows={3}
        />
      ) : (
        <div className="space-y-2">
          <input
            value={local.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="Quiz instructions or URL"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={local.requiresQuizPass}
              onChange={(e) => update({ requiresQuizPass: e.target.checked })}
            />
            Require passing score to complete lesson
          </label>
          {local.requiresQuizPass && (
            <input
              type="number"
              value={local.passingScore}
              onChange={(e) => update({ passingScore: e.target.value })}
              placeholder="Minimum passing score"
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
            />
          )}
        </div>
      )}
    </div>
  );
}
