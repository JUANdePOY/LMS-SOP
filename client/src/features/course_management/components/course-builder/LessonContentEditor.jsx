import { useState, useEffect } from "react";
import { getSops } from "@/features/sop-management/services/sopService";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

const LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "reading", label: "Text / Reading" },
  { value: "link", label: "Link" },
  { value: "quiz", label: "Quiz" },
  { value: "sop", label: "SOP" },
  { value: "certificate", label: "Certificate" },
  { value: "document", label: "Document / File" },
];

export default function LessonContentEditor({ lesson, onChange, onClose }) {
  const [local, setLocal] = useState({
    title: lesson?.title || "",
    type: lesson?.type || "reading",
    content: lesson?.description || lesson?.content || "",
    url: lesson?.url || lesson?.content || "",
    duration: lesson?.duration || "",
    requiresQuizPass: !!lesson?.requiresQuizPass,
    passingScore: lesson?.passingScore || "",
    isRequired: lesson?.is_required ?? true,
  });
  const [availableSops, setAvailableSops] = useState([]);
  const [loadingSops, setLoadingSops] = useState(false);

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange?.(next);
  };

  const isQuiz = local.type === "quiz";

  useEffect(() => {
    if (local.type === "sop") {
      setLoadingSops(true);
      getSops({ exclude_status: "ARCHIVED" })
        .then((res) => {
          const sops = res.data?.data?.rows || res.data?.data || [];
          setAvailableSops(sops);
        })
        .catch((err) => console.error("Failed to fetch SOPs:", err))
        .finally(() => setLoadingSops(false));
    }
  }, [local.type]);

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
        local.type === "sop" ? (
          <div className="space-y-2">
            {loadingSops ? (
              <div className="text-xs text-neutral-500">Loading SOPs...</div>
            ) : (
              <select
                value={local.url}
                onChange={(e) => {
                  const selectedSop = availableSops.find((s) => String(s.id) === e.target.value);
                  update({
                    url: e.target.value,
                    content: e.target.value,
                    description: selectedSop?.title || "",
                  });
                }}
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
              >
                <option value="">Select an SOP...</option>
                {availableSops.map((sop) => (
                  <option key={sop.id} value={sop.id}>
                    {sop.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : local.type === "reading" ? (
          <RichTextEditor
            value={local.content}
            onChange={(html) => update({ content: html, url: html })}
            placeholder="Lesson text content..."
          />
        ) : (
          <textarea
            value={local.content}
            onChange={(e) => update({ content: e.target.value, url: e.target.value })}
            placeholder="Video URL or other content"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
            rows={3}
          />
        )
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Quiz instructions or URL</label>
          <RichTextEditor
            value={local.content}
            onChange={(html) => update({ content: html, url: html })}
            placeholder="Quiz instructions or link..."
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
