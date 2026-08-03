import { useState, useEffect } from "react";
import { FileText, PlayCircle, HelpCircle, Link2, Trash2, File, FileArchive, Settings, Save, Award } from "lucide-react";
import { getSops } from "@/features/sop-management/services/sopService";
import { getMyQuizzes } from "@/features/assessments/api/quiz.api";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

const TYPE_OPTIONS = [
  { value: "video", label: "Video", Icon: PlayCircle },
  { value: "reading", label: "Text / Reading", Icon: FileText },
  { value: "quiz", label: "Quiz", Icon: HelpCircle },
  { value: "link", label: "Link", Icon: Link2 },
  { value: "sop", label: "SOP", Icon: FileText },
  { value: "certificate", label: "Certificate", Icon: Award },
  { value: "document", label: "Document / File", Icon: FileArchive },
];

export default function LessonEditor({ lesson, moduleId, onSave, onDelete, saving }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("reading");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [requiresQuizPass, setRequiresQuizPass] = useState(false);
  const [passingScore, setPassingScore] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [availableSops, setAvailableSops] = useState([]);
  const [loadingSops, setLoadingSops] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  useEffect(() => {
    if (!lesson) return;
    setTitle(lesson.title || "");
    setType(lesson.type || "reading");
    setUrl(lesson.url || lesson.content || "");
    setDescription(lesson.description || lesson.content || "");
    setDuration(lesson.duration || "");
    setRequiresQuizPass(!!lesson.requiresQuizPass);
    setPassingScore(lesson.passingScore || "");
    setIsRequired(lesson.is_required ?? true);
    setSelectedQuizId(lesson.quizId || null);
  }, [lesson?.id]);

  useEffect(() => {
    if (type === "sop") {
      setLoadingSops(true);
      getSops({ exclude_status: "ARCHIVED" })
        .then((res) => {
          const sops = res.data?.data?.rows || res.data?.data || [];
          setAvailableSops(sops);
        })
        .catch((err) => console.error("Failed to fetch SOPs:", err))
        .finally(() => setLoadingSops(false));
    }
  }, [type]);

  useEffect(() => {
    if (type === "quiz") {
      setLoadingQuizzes(true);
      getMyQuizzes()
        .then((res) => {
          const items = res.data || [];
          setQuizzes(items);
          if (!selectedQuizId && items.length) {
            setSelectedQuizId(items[0].id);
          }
        })
        .catch((err) => console.error("Failed to fetch quizzes:", err))
        .finally(() => setLoadingQuizzes(false));
    }
  }, [type]);

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

  const handleTypeChange = (newType) => {
    setType(newType);
    emitPatch({ type: newType });
  };

  const handleQuizChange = (quizId) => {
    setSelectedQuizId(quizId);
    emitPatch({ quizId });
  };

  const handleSave = () => {
    onSave?.({
      title: title.trim(),
      type,
      url: type === "reading" ? description : type === "sop" ? url : url,
      description: type === "reading" || type === "sop" ? description : description,
      duration: duration ? parseInt(duration, 10) : null,
      requiresQuizPass: isQuiz ? requiresQuizPass : false,
      passingScore: isQuiz && requiresQuizPass && passingScore ? parseInt(passingScore, 10) : null,
      is_required: isRequired,
      quizId: isQuiz ? selectedQuizId : null,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {title || "Untitled lesson"}
            </h3>
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">Lesson editor</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {TYPE_OPTIONS.find((o) => o.value === type)?.label || "Reading"}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={12} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 overflow-x-auto">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.Icon;
            const active = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTypeChange(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs whitespace-nowrap ${
                  active
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                }`}
              >
                <Icon size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
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

        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("content")}
              className={`border-b-2 px-1 py-2 text-xs font-medium ${
                activeTab === "content"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`border-b-2 px-1 py-2 text-xs font-medium ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
              }`}
            >
              <Settings size={12} className="inline mr-1" />
              Settings
            </button>
          </nav>
        </div>

        {activeTab === "content" && (
          <div className="space-y-4">
            {!isQuiz ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {type === "reading"
                    ? "Lesson Content"
                    : type === "sop"
                    ? "Select SOP"
                    : type === "link" || type === "document"
                    ? "URL / File"
                    : "Video URL"}
                </label>
                {type === "reading" ? (
                  <RichTextEditor
                    value={description}
                    onChange={(html) => {
                      setDescription(html);
                      emitPatch({ description: html, content: html });
                    }}
                    placeholder="Lesson text content..."
                  />
                ) : type === "sop" ? (
                  <div className="space-y-2">
                    {loadingSops ? (
                      <div className="text-xs text-neutral-500">Loading SOPs...</div>
                    ) : (
                      <select
                        value={url}
                        onChange={(e) => {
                          const selectedSop = availableSops.find((s) => String(s.id) === e.target.value);
                          setUrl(e.target.value);
                          emitPatch({
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
                    {url && (
                      <RichTextEditor
                        value={description}
                        onChange={(html) => {
                          setDescription(html);
                          emitPatch({ description: html });
                        }}
                        placeholder="Optional description for this SOP lesson..."
                      />
                    )}
                  </div>
                ) : (
                  <input
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      emitPatch({ url: e.target.value, content: e.target.value });
                    }}
                    placeholder={
                      type === "link"
                        ? "https://example.com"
                        : type === "document"
                        ? "File URL or document reference..."
                        : "https://youtube.com/watch?v=..."
                    }
                    className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
                  />
                )}
                {type === "video" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Video description</label>
                    <RichTextEditor
                      value={description}
                      onChange={(html) => {
                        setDescription(html);
                        emitPatch({ description: html });
                      }}
                      placeholder="Optional video description..."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Select quiz</label>
                  {loadingQuizzes ? (
                    <div className="text-xs text-neutral-500">Loading quizzes...</div>
                  ) : (
                    <select
                      value={selectedQuizId || ""}
                      onChange={(e) => handleQuizChange(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
                    >
                      <option value="">Select a quiz...</option>
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Quiz instructions</label>
                  <RichTextEditor
                    value={description}
                    onChange={(html) => {
                      setDescription(html);
                      emitPatch({ description: html });
                    }}
                    placeholder="Instructions or link to quiz"
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
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
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
        )}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <button
          type="button"
          onClick={() => onDelete?.()}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} /> Delete lesson
        </button>
      </div>
    </div>
  );
}
