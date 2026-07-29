import { useState, useEffect } from "react";
import { FileText, PlayCircle, HelpCircle, Link2, Trash2 } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "video", label: "Video", Icon: PlayCircle },
  { value: "text", label: "Text", Icon: FileText },
  { value: "quiz", label: "Quiz", Icon: HelpCircle },
  { value: "link", label: "Link", Icon: Link2 },
];

export default function LessonEditor({ lesson, moduleId, onSave, onDelete, saving }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("text");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [requiresQuizPass, setRequiresQuizPass] = useState(false);
  const [passingScore, setPassingScore] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title || "");
    setType(lesson.type || "text");
    setUrl(lesson.url || lesson.content || "");
    setDescription(lesson.description || lesson.content || "");
    setDuration(lesson.duration || "");
    setRequiresQuizPass(!!lesson.requiresQuizPass);
    setPassingScore(lesson.passingScore || "");
    setIsRequired(lesson.is_required ?? true);
  }, [lesson?.id]);

  if (!lesson) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Select a lesson to edit
      </div>
    );
  }

  const isQuiz = type === "quiz";

  const emitPatch = (patch) => {
    onSave?.({ ...lesson, ...patch });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{title || "Untitled lesson"}</h3>
        <p className="text-[10px] uppercase tracking-wide text-neutral-500">Lesson editor</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Title <span className="text-red-500">*</span></label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              emitPatch({ title: e.target.value });
            }}
            placeholder="Lesson title"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Type</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              const active = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setType(opt.value);
                    emitPatch({ type: opt.value });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        {!isQuiz ? (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              {type === "text" ? "Content" : type === "link" ? "URL" : "Video URL"}
            </label>
            {type === "text" ? (
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  emitPatch({ description: e.target.value, content: e.target.value });
                }}
                placeholder="Lesson text content..."
                rows={6}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
              />
            ) : (
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  emitPatch({ url: e.target.value, content: e.target.value });
                }}
                placeholder={type === "link" ? "https://example.com" : "https://youtube.com/watch?v=..."}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
              />
            )}
            {type === "video" && (
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  emitPatch({ description: e.target.value });
                }}
                placeholder="Optional video description..."
                rows={3}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
              />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Quiz instructions or URL</label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  emitPatch({ description: e.target.value });
                }}
                placeholder="Instructions or link to quiz"
                rows={3}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={requiresQuizPass}
                onChange={(e) => {
                  setRequiresQuizPass(e.target.checked);
                  emitPatch({ requiresQuizPass: e.target.checked });
                }}
              />
              Require passing score to complete lesson
            </label>
            {requiresQuizPass && (
              <input
                type="number"
                value={passingScore}
                onChange={(e) => {
                  setPassingScore(e.target.value);
                  emitPatch({ passingScore: e.target.value ? parseInt(e.target.value, 10) : null });
                }}
                placeholder="Minimum passing score"
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
              />
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                emitPatch({ duration: e.target.value ? parseInt(e.target.value, 10) : null });
              }}
              placeholder="e.g. 10"
              className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 mb-1.5">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => {
                  setIsRequired(e.target.checked);
                  emitPatch({ is_required: e.target.checked });
                }}
              />
              Required lesson
            </label>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={() => onDelete?.()}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} /> Delete lesson
        </button>
        <button
          type="button"
          onClick={() =>
            onSave?.({
              title: title.trim(),
              type,
              url: type === "text" ? description : url,
              description: type === "text" ? description : description,
              duration: duration ? parseInt(duration, 10) : null,
              requiresQuizPass: isQuiz ? requiresQuizPass : false,
              passingScore: isQuiz && requiresQuizPass && passingScore ? parseInt(passingScore, 10) : null,
              is_required: isRequired,
            })
          }
          disabled={saving}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save lesson"}
        </button>
      </div>
    </div>
  );
}
