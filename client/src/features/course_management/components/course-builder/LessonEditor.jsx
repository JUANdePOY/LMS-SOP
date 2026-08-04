import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  PlayCircle,
  HelpCircle,
  Link2,
  Trash2,
  FileArchive,
  Settings,
  Save,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getSops } from "@/features/sop-management/services/sopService";
import { getMyQuizzes } from "@/features/assessments/api/quiz.api";
import { getCertificateTemplates } from "@/features/certificate-management/services/certificateService";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

const TYPE_OPTIONS = [
  { value: "video", label: "Video", Icon: PlayCircle },
  { value: "reading", label: "Reading", Icon: FileText },
  { value: "quiz", label: "Quiz", Icon: HelpCircle },
  { value: "link", label: "Link", Icon: Link2 },
  { value: "sop", label: "SOP", Icon: FileText },
  { value: "certificate", label: "Certificate", Icon: Award },
  { value: "document", label: "Document", Icon: FileArchive },
];

const TABS = [
  { id: "content", label: "Content", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function LessonEditor({ lesson, onSave, onDelete, saving }) {
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
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const isQuiz = type === "quiz";

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
    setSelectedCertificateId(lesson.certificateTemplateId || null);
    setDocumentFile(lesson.documentFile || null);
    setHasChanges(false);
    setSaveError(null);
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
          if (!items.find((q) => q.id === selectedQuizId) && items.length) {
            setSelectedQuizId(items[0].id);
          }
        })
        .catch((err) => console.error("Failed to fetch quizzes:", err))
        .finally(() => setLoadingQuizzes(false));
    }
  }, [type, selectedQuizId]);

  useEffect(() => {
    if (type === "certificate") {
      setLoadingCertificates(true);
      getCertificateTemplates({ status: "active", limit: 50 })
        .then((res) => {
          const items = res.data?.data?.rows || res.data?.data || [];
          setCertificateTemplates(items);
        })
        .catch((err) => console.error("Failed to fetch certificate templates:", err))
        .finally(() => setLoadingCertificates(false));
    }
  }, [type]);

  if (!lesson) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center mx-auto">
            <FileText size={24} className="text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-500">Select a lesson to edit</p>
          <p className="text-xs text-neutral-400">Choose from the outline or create a new lesson</p>
        </div>
      </div>
    );
  }

  const emitPatch = useCallback((patch) => {
    setHasChanges(true);
    setSaveError(null);
    onSave?.({ ...lesson, ...patch });
  }, [lesson, onSave]);

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
      certificateTemplateId: type === "certificate" ? selectedCertificateId : null,
      documentFile: type === "document" ? documentFile : null,
    });
    setHasChanges(false);
    setLastSavedAt(new Date());
    setSaveError(null);
  };

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      emitPatch({ title: e.target.value });
                    }}
                    placeholder="Lesson title"
                    className="w-full text-base font-medium text-neutral-900 placeholder:text-neutral-400 bg-transparent border-0 border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 focus:ring-0 p-0 pb-1 transition-colors"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    {isQuiz ? "Quiz lesson" : TYPE_OPTIONS.find((o) => o.value === type)?.label + " lesson"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {lastSavedAt && !hasChanges && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400">
                      <CheckCircle2 size={12} />
                      Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 active:bg-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span className="hidden sm:inline">{saving ? "Saving" : "Save"}</span>
                  </button>
                </div>
              </div>

              <nav className="mt-3 flex items-center gap-1" aria-label="Lesson type">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.Icon;
                  const active = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTypeChange(opt.value)}
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
                        ${active
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"}
                      `}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="px-4 pt-4 pb-1">
              <nav className="-mb-px flex gap-6" aria-label="Editor sections">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        inline-flex items-center gap-2 px-1 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                        ${active
                          ? "border-neutral-900 text-neutral-900"
                          : "border-transparent text-neutral-500 hover:text-neutral-700"}
                      `}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="px-4 py-5">
              {activeTab === "content" && (
                <div className="space-y-5">
                  {!isQuiz ? (
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="lesson-title-input" className="block text-sm font-medium text-neutral-700 mb-2">
                          Title <span className="text-neutral-400" aria-label="required">*</span>
                        </label>
                        <input
                          id="lesson-title-input"
                          value={title}
                          onChange={(e) => {
                            setTitle(e.target.value);
                            emitPatch({ title: e.target.value });
                          }}
                          placeholder="Enter lesson title"
                          className="w-full border border-neutral-300 bg-white rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                        />
                      </div>

                      {type === "reading" ? (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Content
                          </label>
                          <div className="rounded-lg border border-neutral-200 overflow-hidden">
                            <RichTextEditor
                              value={description}
                              onChange={(html) => {
                                setDescription(html);
                                emitPatch({ description: html, content: html });
                              }}
                              placeholder="Start writing..."
                            />
                          </div>
                        </div>
                      ) : type === "sop" ? (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="sop-select" className="block text-sm font-medium text-neutral-700 mb-2">
                              Select SOP
                            </label>
                            {loadingSops ? (
                              <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-lg px-3 py-2">
                                <Loader2 size={16} className="animate-spin text-neutral-500" />
                                <span className="text-sm text-neutral-500">Loading...</span>
                              </div>
                            ) : (
                              <select
                                id="sop-select"
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
                                className="w-full border border-neutral-300 bg-white rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
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
                          {url && (
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Notes
                              </label>
                              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                                <RichTextEditor
                                  value={description}
                                  onChange={(html) => {
                                    setDescription(html);
                                    emitPatch({ description: html });
                                  }}
                                  placeholder="Optional notes..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : type === "certificate" ? (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="cert-select" className="block text-sm font-medium text-neutral-700 mb-2">
                              Certificate Template
                            </label>
                            {loadingCertificates ? (
                              <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-lg px-3 py-2">
                                <Loader2 size={16} className="animate-spin text-neutral-500" />
                                <span className="text-sm text-neutral-500">Loading...</span>
                              </div>
                            ) : (
                              <select
                                id="cert-select"
                                value={selectedCertificateId || ""}
                                onChange={(e) => {
                                  const id = e.target.value ? Number(e.target.value) : null;
                                  setSelectedCertificateId(id);
                                  emitPatch({ certificateTemplateId: id, url: id ? String(id) : "" });
                                }}
                                className="w-full border border-neutral-300 bg-white rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                              >
                                <option value="">Select a certificate template...</option>
                                {certificateTemplates.map((tpl) => (
                                  <option key={tpl.id} value={tpl.id}>
                                    {tpl.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ) : type === "document" ? (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="doc-upload" className="block text-sm font-medium text-neutral-700 mb-2">
                              Document
                            </label>
                            <div className="relative border border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors">
                              <input
                                id="doc-upload"
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  setDocumentFile(file || null);
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      emitPatch({ documentFile: file, url: reader.result });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                                <FileArchive size={24} className="text-neutral-400 mb-2" />
                                {documentFile ? (
                                  <>
                                    <p className="text-sm text-neutral-700">{documentFile.name}</p>
                                    <p className="text-xs text-neutral-500 mt-1">Click to change</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm text-neutral-700">Click to upload</p>
                                    <p className="text-xs text-neutral-500 mt-1">PDF, DOCX, PPTX</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="lesson-url" className="block text-sm font-medium text-neutral-700 mb-2">
                            {type === "link" ? "Link" : "Video URL"}
                          </label>
                          <input
                            id="lesson-url"
                            value={url}
                            onChange={(e) => {
                              setUrl(e.target.value);
                              emitPatch({ url: e.target.value, content: e.target.value });
                            }}
                            placeholder={
                              type === "link"
                                ? "https://example.com"
                                : "https://youtube.com/watch?v=..."
                            }
                            className="w-full border border-neutral-300 bg-white rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                          />
                          {type === "video" && (
                            <div className="mt-5">
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Description
                              </label>
                              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                                <RichTextEditor
                                  value={description}
                                  onChange={(html) => {
                                    setDescription(html);
                                    emitPatch({ description: html });
                                  }}
                                  placeholder="Optional description..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="quiz-select" className="block text-sm font-medium text-neutral-700 mb-2">
                          Quiz
                        </label>
                        {loadingQuizzes ? (
                          <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-lg px-3 py-2">
                            <Loader2 size={16} className="animate-spin text-neutral-500" />
                            <span className="text-sm text-neutral-500">Loading...</span>
                          </div>
                        ) : (
                          <select
                            id="quiz-select"
                            value={selectedQuizId || ""}
                            onChange={(e) => handleQuizChange(e.target.value ? Number(e.target.value) : null)}
                            className="w-full border border-neutral-300 bg-white rounded-lg px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
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
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Instructions
                        </label>
                        <div className="rounded-lg border border-neutral-200 overflow-hidden">
                          <RichTextEditor
                            value={description}
                            onChange={(html) => {
                              setDescription(html);
                              emitPatch({ description: html });
                            }}
                            placeholder="Instructions or context..."
                          />
                        </div>
                      </div>

                      <div className="border border-neutral-200 rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={requiresQuizPass}
                            onChange={(e) => {
                              setRequiresQuizPass(e.target.checked);
                              emitPatch({ requiresQuizPass: e.target.checked });
                            }}
                            className="mt-0.5 w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-neutral-700">
                              Require passing score
                            </span>
                            <p className="text-xs text-neutral-500 mt-0.5">Learners must pass to complete this lesson</p>
                          </div>
                        </label>

                        {requiresQuizPass && (
                          <div className="mt-4 pl-7">
                            <label htmlFor="passing-score" className="block text-sm font-medium text-neutral-700 mb-2">
                              Minimum Passing Score
                            </label>
                            <div className="relative max-w-xs">
                              <input
                                id="passing-score"
                                type="number"
                                value={passingScore}
                                onChange={(e) => {
                                  setPassingScore(e.target.value);
                                  emitPatch({ passingScore: e.target.value ? parseInt(e.target.value, 10) : null });
                                }}
                                placeholder="e.g. 70"
                                min="0"
                                max="100"
                                className="w-full border border-neutral-300 bg-white rounded-lg pl-3 pr-8 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                              />
                              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-neutral-500">%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="duration" className="block text-sm font-medium text-neutral-700 mb-2">
                        Duration
                      </label>
                      <div className="relative">
                        <input
                          id="duration"
                          type="number"
                          value={duration}
                          onChange={(e) => {
                            setDuration(e.target.value);
                            emitPatch({ duration: e.target.value ? parseInt(e.target.value, 10) : null });
                          }}
                          placeholder="e.g. 10"
                          min="0"
                          className="w-full border border-neutral-300 bg-white rounded-lg pl-3 pr-10 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-neutral-500">min</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1.5">Estimated completion time</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Visibility
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isRequired}
                          onChange={(e) => {
                            setIsRequired(e.target.checked);
                            emitPatch({ is_required: e.target.checked });
                          }}
                          className="w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900 rounded"
                        />
                        <div>
                          <span className="text-sm text-neutral-700">Required lesson</span>
                          <p className="text-xs text-neutral-500">Must be completed by learners</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-neutral-200 bg-white px-5 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg disabled:opacity-40 transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs text-neutral-400">
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
