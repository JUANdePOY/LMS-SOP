import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  PlayCircle,
  HelpCircle,
  Link2,
  Plus,
  Trash2,
  FileArchive,
  Settings,
  Save,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  ListVideo,
  Image as ImageIcon,
  X,
  ExternalLink,
  Copy,
} from "lucide-react";
import { getSops } from "@/features/sop-management/services/sopService";
import { getQuizzes, duplicateQuiz } from "@/features/assessments/api/quiz.api";
import { getCertificateTemplates } from "@/features/certificate-management/services/certificateService";
import { uploadContent } from "@/features/course_management/api/content.api";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";
import LessonContentBlocks, { extractOutline, parseBlocks } from "./LessonContentBlocks";
import OutlineRail from "./OutlineRail";
import VideoPreview from "./VideoPreview";
import ChapterEditor from "./ChapterEditor";
import ThumbnailSelector from "./ThumbnailSelector";
import Accordion from "./Accordion";
import LinkPreview, { isValidUrl } from "./LinkPreview";
import SopPreview from "./SopPreview";
import SopPicker from "./SopPicker";
import CertificatePreview from "./CertificatePreview";
import CertificatePicker from "./CertificatePicker";
import DocumentPreview, { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, isAcceptedDocument, formatBytes } from "./DocumentPreview";
import CreateQuizModal from "@/features/assessments/components/modals/CreateQuizModal";
import { parseVideoUrl, PROVIDER_LABEL } from "@/features/course_management/utils/videoUrl";

const TYPE_OPTIONS = [
  { value: "video", label: "Video", Icon: PlayCircle, hint: "Embed a YouTube or Vimeo link" },
  { value: "reading", label: "Reading", Icon: FileText, hint: "Write rich text content" },
  { value: "quiz", label: "Quiz", Icon: HelpCircle, hint: "Attach an assessment" },
  { value: "link", label: "Link", Icon: Link2, hint: "Point to an external resource" },
  { value: "sop", label: "SOP", Icon: FileText, hint: "Embed a standard operating procedure" },
  { value: "certificate", label: "Certificate", Icon: Award, hint: "Award a certificate on completion" },
  { value: "document", label: "Document", Icon: FileArchive, hint: "Upload a PDF, DOCX or PPTX" },
];

const TYPE_CONFIG = {
  video: { icon: PlayCircle, label: "Video", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  reading: { icon: FileText, label: "Text", color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  quiz: { icon: HelpCircle, label: "Quiz", color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  link: { icon: Link2, label: "Link", color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" },
  sop: { icon: FileText, label: "SOP", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
  certificate: { icon: Award, label: "Cert", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
  document: { icon: FileArchive, label: "File", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
};

const TABS = [
  { id: "content", label: "Content", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const TYPE_HELPER = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.hint]));

function QuizSummaryCard({ quiz, requiresQuizPass, onEdit, onDuplicate, onDetach }) {
  const questionCount = quiz.question_count ?? 0;
  const typeLabel = quiz.quiz_type === "final" ? "Final" : "Practice";
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="shrink-0 text-neutral-500" />
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{quiz.title || "Untitled quiz"}</p>
            <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">{typeLabel}</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {questionCount} {questionCount === 1 ? "question" : "questions"}
            {requiresQuizPass ? " · passing score required" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Edit questions in Quiz Builder"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <ExternalLink size={13} /> Edit
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate quiz"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <Copy size={13} /> Duplicate
          </button>
          <button
            type="button"
            onClick={onDetach}
            title="Detach quiz"
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-red-950/30 transition-colors"
          >
            <X size={13} /> Detach
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LessonEditor({
  lesson,
  onSave,
  onDelete,
  saving,
  courseId,
  courseTitle,
  moduleId,
  onNavigatePrev,
  onNavigateNext,
  canNavigatePrev,
  canNavigateNext,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onOpenQuizBuilder,
}) {
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
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [selectedCertificateId, setSelectedCertificateId] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [chapters, setChapters] = useState([]);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const titleRef = useRef(null);
  const isQuiz = type === "quiz";
  const isNewLesson = !!lesson?.isNew;
  const typeConfig = TYPE_CONFIG[type] || TYPE_CONFIG.reading;
  const selectedQuiz = isQuiz ? quizzes.find((q) => q.id === selectedQuizId) || null : null;

  const handleImageUpload = useCallback(
    async (file) => {
      if (!courseId || !moduleId) {
        throw new Error("Save the module first to add images");
      }
      const result = await uploadContent(courseId, moduleId, file);
      return result?.data?.view_url || result?.view_url;
    },
    [courseId, moduleId]
  );

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
    setLinkTitle(lesson.linkTitle || "");
    setChapters(Array.isArray(lesson.chapters) ? lesson.chapters : []);
    setThumbnailUrl(lesson.thumbnail_url || lesson.thumbnailUrl || null);
    setHasChanges(false);
    setSaveError(null);
  }, [lesson?.id]);

  // Move focus to the title when a brand-new lesson is opened.
  useEffect(() => {
    if (isNewLesson && titleRef.current) {
      const t = setTimeout(() => titleRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isNewLesson, lesson?.id]);

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
      getQuizzes(courseId)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, courseId]);

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

  // Keyboard shortcuts: Ctrl/Cmd+S saves.
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  const hasContent = () => {
    const text = (description || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
    if (text) return true;
    if (url && type !== "reading") return true;
    if (type === "quiz" && selectedQuizId) return true;
    if (type === "certificate" && selectedCertificateId) return true;
    if (type === "document" && documentFile) return true;
    if (type === "video" && (chapters.length || thumbnailUrl)) return true;
    return false;
  };

  const applyTypeChange = (newType) => {
    setPendingType(null);
    setType(newType);
    setDescription("");
    setUrl("");
    setRequiresQuizPass(false);
    setPassingScore("");
    setSelectedQuizId(null);
    setSelectedCertificateId(null);
    setDocumentFile(null);
    setLinkTitle("");
    setChapters([]);
    setThumbnailUrl(null);
    emitPatch({ type: newType });
  };

  const handleTypeChange = (newType) => {
    if (newType === type) return;
    if (hasContent()) {
      setPendingType(newType);
      return;
    }
    applyTypeChange(newType);
  };

  const handleQuizChange = (quizId) => {
    // Guard: only allow quizzes that belong to the current course's scoped list.
    if (quizId && !quizzes.some((q) => q.id === quizId)) return;
    setSelectedQuizId(quizId);
    emitPatch({ quizId });
  };

  const handleDuplicateQuiz = async () => {
    if (!selectedQuizId) return;
    try {
      const res = await duplicateQuiz(selectedQuizId);
      const created = res?.data;
      if (created?.id) {
        const refreshed = await getQuizzes(courseId);
        setQuizzes(refreshed.data || []);
        setSelectedQuizId(created.id);
        emitPatch({ quizId: created.id });
      }
    } catch (err) {
      console.error("Failed to duplicate quiz:", err);
    }
  };

  const handleSave = () => {
    onSave?.({
      title: title.trim(),
      type,
      url: type === "reading" ? description : url,
      description: type === "reading" ? description : description,
      duration: duration ? parseInt(duration, 10) : null,
      requiresQuizPass: isQuiz ? requiresQuizPass : false,
      passingScore: isQuiz && requiresQuizPass && passingScore ? parseInt(passingScore, 10) : null,
      is_required: isRequired,
      quizId: isQuiz ? selectedQuizId : null,
      certificateTemplateId: type === "certificate" ? selectedCertificateId : null,
      documentFile: type === "document" ? documentFile : null,
      chapters: type === "video" ? chapters : [],
      thumbnail_url: thumbnailUrl || null,
    });
    setHasChanges(false);
    setLastSavedAt(new Date());
    setSaveError(null);
  };

  // Keep a stable ref so the global keydown handler can call the latest save.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const handleDelete = () => {
    onDelete?.();
  };

  const saveStatus = saving ? (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-blue-600">
      <Loader2 size={12} className="animate-spin" />
      Saving
    </span>
  ) : lastSavedAt && !hasChanges ? (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400">
      <CheckCircle2 size={12} />
      Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  ) : hasChanges ? (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-600">
      <AlertCircle size={12} />
      Unsaved
    </span>
  ) : null;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex flex-1 min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        {/* Header (inside the unified card) */}
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center justify-center rounded px-1.5 py-1 text-[10px] font-medium ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Lesson
                </span>
              </div>
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  emitPatch({ title: e.target.value });
                }}
                placeholder="Lesson title"
                aria-label="Lesson title"
                className="w-full text-lg font-semibold text-neutral-900 placeholder:text-neutral-400 bg-transparent border-0 border-b border-transparent hover:border-neutral-300 focus:border-blue-600 focus:ring-0 p-0 pb-1 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {saveStatus}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

          {/* Type selector — segmented control */}
          <nav className="mt-3 flex flex-wrap items-center gap-1" aria-label="Lesson type">
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              const active = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeChange(opt.value)}
                  aria-pressed={active}
                  title={opt.hint}
                  className={`
                    inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                    ${active
                      ? "bg-blue-600 text-white"
                      : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"}
                  `}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Helpful one-liner for the active type */}
          <p className="mt-2 text-xs text-neutral-500">{TYPE_HELPER[type]}</p>

          {/* Tabs (semantic) */}
          <div className="mt-3">
            <nav role="tablist" aria-label="Editor sections" className="-mb-px flex gap-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`lesson-tab-${tab.id}`}
                    aria-selected={active}
                    aria-controls={`lesson-panel-${tab.id}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        const dir = e.key === "ArrowRight" ? 1 : -1;
                        const idx = TABS.findIndex((t) => t.id === activeTab);
                        const next = TABS[(idx + dir + TABS.length) % TABS.length];
                        setActiveTab(next.id);
                      }
                    }}
                    className={`
                      inline-flex items-center gap-2 px-1 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-t
                      ${active
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-neutral-500 hover:text-neutral-700"}
                    `}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-4xl mx-auto">
          <div
            key={type}
            className="animate-[fadeIn_0.18s_ease-out]"
          >
            <div className="px-4 py-5" role="tabpanel" id="lesson-panel-content" aria-labelledby="lesson-tab-content" hidden={activeTab !== "content"}>
              {activeTab === "content" && (
                <div className="space-y-5">
                  {!isQuiz ? (
                    <div className="space-y-5">
                      {type === "reading" ? (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Content
                            </label>
                            <LessonContentBlocks
                              key={lesson?.id}
                              value={description}
                              onChange={(html) => {
                                setDescription(html);
                                emitPatch({ description: html, content: html });
                              }}
                              onImageUpload={handleImageUpload}
                            />
                          </div>
                          <div className="hidden lg:block">
                            <div className="sticky top-4">
                              <OutlineRail
                                items={extractOutline(parseBlocks(description))}
                                onJump={() => {}}
                              />
                            </div>
                          </div>
                        </div>
                      ) : type === "sop" ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Select SOP
                            </label>
                            {loadingSops ? (
                              <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-md px-3 py-2">
                                <Loader2 size={16} className="animate-spin text-neutral-500" />
                                <span className="text-sm text-neutral-500">Loading...</span>
                              </div>
                            ) : (
                              <SopPicker
                                sops={availableSops}
                                value={url}
                                onChange={(id) => {
                                  const selectedSop = availableSops.find((s) => String(s.id) === id);
                                  setUrl(id);
                                  setTitle(selectedSop?.title || "");
                                  emitPatch({
                                    title: selectedSop?.title || "",
                                    url: id,
                                    content: id,
                                    description: selectedSop?.title || "",
                                  });
                                }}
                                onOpen={() => {
                                  if (url) window.open(`/sop/${url}`, "_blank", "noopener,noreferrer");
                                }}
                              />
                            )}
                          </div>

                          <SopPreview
                            sop={availableSops.find((s) => String(s.id) === String(url)) || null}
                            onOpen={() => {
                              if (url) window.open(`/sop/${url}`, "_blank", "noopener,noreferrer");
                            }}
                          />

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Notes <span className="font-normal text-neutral-400">(optional)</span>
                            </label>
                            <div className="rounded-md border border-neutral-200 overflow-hidden">
                              <RichTextEditor
                                key={lesson?.id}
                                value={description}
                                onChange={(html) => {
                                  setDescription(html);
                                  emitPatch({ description: html });
                                }}
                                onImageUpload={handleImageUpload}
                                placeholder="Add lesson-specific context; the full SOP is shown to learners above."
                              />
                            </div>
                            <p className="mt-1.5 text-xs text-neutral-500">
                              The full SOP is displayed to learners; use notes for instructions specific to this lesson.
                            </p>
                          </div>
                        </div>
                      ) : type === "certificate" ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Certificate Template
                            </label>
                            {loadingCertificates ? (
                              <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-md px-3 py-2">
                                <Loader2 size={16} className="animate-spin text-neutral-500" />
                                <span className="text-sm text-neutral-500">Loading templates...</span>
                              </div>
                            ) : (
                              <CertificatePicker
                                templates={certificateTemplates}
                                value={selectedCertificateId}
                                onChange={(id) => {
                                  const nextId = id ? Number(id) : null;
                                  setSelectedCertificateId(nextId);
                                  emitPatch({
                                    certificateTemplateId: nextId,
                                    url: nextId ? String(nextId) : "",
                                  });
                                }}
                                onOpen={() => {
                                  if (selectedCertificateId) {
                                    window.open(
                                      `/certificates`,
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                  }
                                }}
                              />
                            )}
                            <p className="mt-1.5 text-xs text-neutral-500">
                              Learners receive this certificate once they complete the course.
                            </p>
                          </div>

                          <CertificatePreview
                            template={
                              certificateTemplates.find(
                                (t) => String(t.id) === String(selectedCertificateId)
                              ) || null
                            }
                            onOpen={() => {
                              if (selectedCertificateId) {
                                window.open(
                                  `/certificates`,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }
                            }}
                          />
                        </div>
                      ) : type === "document" ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Document
                            </label>
                            <input
                              id="doc-upload"
                              type="file"
                              accept={DOCUMENT_ACCEPT}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setDocumentFile(file);
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    emitPatch({ documentFile: file, url: reader.result });
                                  };
                                  reader.readAsDataURL(file);
                                } else {
                                  emitPatch({ documentFile: null, url: "" });
                                }
                                e.target.value = "";
                              }}
                              className="sr-only"
                            />
                            <label
                              htmlFor="doc-upload"
                              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
                                documentFile
                                  ? "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                                  : "border-neutral-300 bg-white hover:border-blue-400 hover:bg-blue-50/40"
                              }`}
                            >
                              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                                <FileArchive size={22} />
                              </span>
                              {documentFile ? (
                                <>
                                  <p className="text-sm font-medium text-neutral-700">{documentFile.name}</p>
                                  <p className="text-xs text-neutral-500">Click to replace</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-neutral-700">Click to upload a document</p>
                                  <p className="text-xs text-neutral-500">PDF, DOCX, PPTX, XLSX, CSV · up to 25 MB</p>
                                </>
                              )}
                            </label>
                            {documentFile && !isAcceptedDocument(documentFile.name) && (
                              <p className="mt-1.5 text-xs text-amber-600">
                                This file type isn’t supported. Use a PDF, Word, PowerPoint, Excel, or CSV file.
                              </p>
                            )}
                            {documentFile && documentFile.size > DOCUMENT_MAX_BYTES && (
                              <p className="mt-1.5 text-xs text-amber-600">
                                File is {formatBytes(documentFile.size)} — the limit is 25 MB and may fail to upload.
                              </p>
                            )}
                          </div>

                          <DocumentPreview
                            file={documentFile}
                            url={url}
                            onRemove={() => {
                              setDocumentFile(null);
                              emitPatch({ documentFile: null, url: "" });
                            }}
                            onOpen={() => {
                              if (url) window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          />

                          <div>
                            <label htmlFor="doc-title" className="block text-sm font-medium text-neutral-700 mb-2">
                              Document title <span className="font-normal text-neutral-400">(optional)</span>
                            </label>
                            <input
                              id="doc-title"
                              value={linkTitle}
                              onChange={(e) => {
                                setLinkTitle(e.target.value);
                                emitPatch({ linkTitle: e.target.value });
                              }}
                              placeholder="e.g. Safety Manual v3"
                              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                            />
                            <p className="mt-1.5 text-xs text-neutral-500">
                              Shown in the course outline when set; otherwise the file name is used.
                            </p>
                          </div>
                        </div>
                      ) : type === "video" ? (
                        <div className="space-y-5">
                          <VideoPreview url={url} />

                          <div>
                            <label htmlFor="lesson-url" className="block text-sm font-medium text-neutral-700 mb-2">
                              Video URL
                            </label>
                            <input
                              id="lesson-url"
                              value={url}
                              onChange={(e) => {
                                setUrl(e.target.value);
                                emitPatch({ url: e.target.value, content: e.target.value });
                              }}
                              placeholder="https://youtube.com/watch?v=..."
                              aria-invalid={!!url && !parseVideoUrl(url)}
                              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                            />
                            {url && parseVideoUrl(url) && (
                              <p className="mt-1.5 text-xs text-neutral-500">
                                Source: {PROVIDER_LABEL[parseVideoUrl(url).provider]}
                              </p>
                            )}
                          </div>

                          <Accordion title="Chapters & Timestamps" icon={ListVideo} defaultOpen={chapters.length > 0}>
                            <ChapterEditor
                              chapters={chapters}
                              onChange={(next) => {
                                setChapters(next);
                                emitPatch({ chapters: next });
                              }}
                            />
                          </Accordion>

                          <Accordion title="Thumbnail" icon={ImageIcon} defaultOpen={!!thumbnailUrl}>
                            <ThumbnailSelector
                              courseId={courseId}
                              moduleId={moduleId}
                              value={thumbnailUrl}
                              onChange={(next) => {
                                setThumbnailUrl(next);
                                emitPatch({ thumbnail_url: next });
                              }}
                            />
                          </Accordion>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Description
                            </label>
                               <div className="rounded-md border border-neutral-200 overflow-hidden">
                                 <RichTextEditor
                                   key={lesson?.id}
                                   value={description}
                                   onChange={(html) => {
                                     setDescription(html);
                                     emitPatch({ description: html });
                                   }}
                                   onImageUpload={handleImageUpload}
                                   placeholder="Optional description..."
                                 />
                               </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div>
                            <label htmlFor="lesson-url" className="block text-sm font-medium text-neutral-700 mb-2">
                              Link URL
                            </label>
                            <div className="flex items-stretch gap-2">
                              <div className="relative flex-1">
                                <Link2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                  id="lesson-url"
                                  value={url}
                                  onChange={(e) => {
                                    setUrl(e.target.value);
                                    emitPatch({ url: e.target.value, content: e.target.value });
                                  }}
                                  placeholder="https://example.com"
                                  aria-invalid={!!url.trim() && !isValidUrl(url)}
                                  className={`w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-1 transition-colors ${
                                    url.trim() && !isValidUrl(url)
                                      ? "border-red-300 focus:border-red-600 focus:ring-red-600"
                                      : "border-neutral-200 focus:border-blue-600 focus:ring-blue-600"
                                  }`}
                                />
                              </div>
                              <a
                                href={isValidUrl(url) ? url : undefined}
                                target="_blank"
                                rel="noreferrer noopener"
                                aria-disabled={!isValidUrl(url)}
                                title="Open link in a new tab"
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                  isValidUrl(url)
                                    ? "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                                    : "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300"
                                }`}
                              >
                                <ExternalLink size={14} /> Open
                              </a>
                            </div>
                            {url.trim() && !isValidUrl(url) && (
                              <p className="mt-1.5 text-xs text-red-600">Enter a full URL starting with http:// or https://</p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="link-title" className="block text-sm font-medium text-neutral-700 mb-2">
                              Link title <span className="font-normal text-neutral-400">(optional)</span>
                            </label>
                            <input
                              id="link-title"
                              value={linkTitle}
                              onChange={(e) => {
                                setLinkTitle(e.target.value);
                                emitPatch({ linkTitle: e.target.value });
                              }}
                              placeholder="e.g. Company Handbook"
                              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                            />
                            <p className="mt-1.5 text-xs text-neutral-500">Shown in the course outline when set; otherwise the link host is used.</p>
                          </div>

                          <LinkPreview url={url} title={linkTitle} />

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Description
                            </label>
                            <div className="rounded-md border border-neutral-200 overflow-hidden">
                              <RichTextEditor
                                key={lesson?.id}
                                value={description}
                                onChange={(html) => {
                                  setDescription(html);
                                  emitPatch({ description: html });
                                }}
                                onImageUpload={handleImageUpload}
                                placeholder="Optional context for learners..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <label htmlFor="quiz-select" className="block text-sm font-medium text-neutral-700">
                            Quiz
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowCreateQuiz(true)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <Plus size={14} /> Create new
                          </button>
                        </div>
                        {loadingQuizzes ? (
                          <div className="flex items-center gap-2 border border-neutral-200 bg-white rounded-md px-3 py-2">
                            <Loader2 size={16} className="animate-spin text-neutral-500" />
                            <span className="text-sm text-neutral-500">Loading...</span>
                          </div>
                        ) : quizzes.length === 0 ? (
                          <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
                            No quizzes in this course yet. Create one below, then attach it.
                          </div>
                        ) : (
                          <select
                            id="quiz-select"
                            value={selectedQuizId || ""}
                            onChange={(e) => handleQuizChange(e.target.value ? Number(e.target.value) : null)}
                            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
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

                      {selectedQuiz && (
                        <QuizSummaryCard
                          quiz={selectedQuiz}
                          requiresQuizPass={requiresQuizPass}
                          onEdit={() => onOpenQuizBuilder?.(selectedQuiz.id)}
                          onDuplicate={handleDuplicateQuiz}
                          onDetach={() => {
                            setSelectedQuizId(null);
                            emitPatch({ quizId: null });
                          }}
                        />
                      )}

                      {isQuiz && requiresQuizPass && !selectedQuizId && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          <span>Attach a quiz before requiring a passing score, or this lesson cannot be completed.</span>
                        </div>
                      )}

                      {isQuiz && requiresQuizPass && selectedQuiz && (selectedQuiz.question_count ?? 0) === 0 && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                          <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          <span>This quiz has no questions yet. Add questions in the Quiz Builder before publishing.</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Instructions
                        </label>
                         <div className="rounded-md border border-neutral-200 overflow-hidden">
                           <RichTextEditor
                             key={lesson?.id}
                             value={description}
                             onChange={(html) => {
                               setDescription(html);
                               emitPatch({ description: html });
                             }}
                             onImageUpload={handleImageUpload}
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
                            className="mt-0.5 w-4 h-4 border-neutral-300 text-blue-600 focus:ring-blue-600 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-neutral-700">
                              Require quiz completion
                            </span>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              Learners must submit the attached quiz to mark the lesson complete.
                            </p>
                          </div>
                        </label>

                        {requiresQuizPass && (
                          <div className="mt-4 pl-7 space-y-2">
                            <label htmlFor="passing-score" className="block text-sm font-medium text-neutral-700 mb-2">
                              Minimum Passing Score (optional)
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
                                className="w-full rounded-md border border-neutral-200 bg-white pl-3 pr-8 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                              />
                              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-neutral-500">%</span>
                            </div>
                            <p className="text-xs text-neutral-500">
                              Leave blank to require only quiz completion instead of a minimum score.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="px-4 py-5"
              role="tabpanel"
              id="lesson-panel-settings"
              aria-labelledby="lesson-tab-settings"
              hidden={activeTab !== "settings"}
            >
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
                          className="w-full rounded-md border border-neutral-200 bg-white pl-3 pr-10 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
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
                          className="w-4 h-4 border-neutral-300 text-blue-600 focus:ring-blue-600 rounded"
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

      {/* Footer with navigation + delete */}
      <footer className="border-t border-neutral-200 bg-white px-5 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNavigatePrev}
              disabled={!canNavigatePrev}
              title="Previous lesson"
              aria-label="Previous lesson"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="Move lesson up"
              aria-label="Move lesson up"
              className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="Move lesson down"
              aria-label="Move lesson down"
              className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDown size={16} />
            </button>
            <button
              type="button"
              onClick={onNavigateNext}
              disabled={!canNavigateNext}
              title="Next lesson"
              aria-label="Next lesson"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </footer>

      <CreateQuizModal
        open={showCreateQuiz}
        courses={courseId ? [{ id: courseId, title: courseTitle || "Current course" }] : []}
        loadingCourses={false}
        lockCourseId={courseId}
        onCancel={() => setShowCreateQuiz(false)}
        onComplete={async ({ quizId }) => {
          if (!quizId) return;
          setShowCreateQuiz(false);
          try {
            const res = await getQuizzes(courseId);
            setQuizzes(res.data || []);
          } catch {
            /* keep prior list on refresh failure */
          }
          setSelectedQuizId(quizId);
          emitPatch({ quizId });
        }}
      />

      {pendingType && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="type-change-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPendingType(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertCircle size={18} />
              </span>
              <div className="min-w-0">
                <h3 id="type-change-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Switch lesson type?
                </h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  This lesson already has content for the <span className="font-medium">{TYPE_CONFIG[type]?.label || type}</span> type.
                  Changing to <span className="font-medium">{TYPE_CONFIG[pendingType]?.label || pendingType}</span> will clear the current content and cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingType(null)}
                className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
              >
                Keep current
              </button>
              <button
                type="button"
                onClick={() => applyTypeChange(pendingType)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Switch & clear
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
