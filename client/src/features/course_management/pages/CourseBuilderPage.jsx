import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/shared/components/ui/Toast";
import { ChevronLeft, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, X, Save, Rocket, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";
import CourseOutline from "../components/course-builder/CourseOutline";
import LessonEditor from "../components/course-builder/LessonEditor";
import ModuleEditor from "../components/course-builder/ModuleEditor";
import PublishReadiness from "../components/course-builder/PublishReadiness";
import { builderGet, builderUpdate, publishCourse } from "../api/course.api";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300", icon: Clock },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300", icon: CheckCircle2 },
  archived: { label: "Archived", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300", icon: AlertCircle },
};

export default function CourseBuilderPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const modulesRef = useRef([]);
  const [loadingError, setLoadingError] = useState(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [showRightSidebar, setShowRightSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [lastSaved, setLastSaved] = useState(null);
  const [outlineFilter, setOutlineFilter] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  useEffect(() => {
    setShowRightSidebar(false);
  }, []);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    thumbnail_url: "",
    status: "draft",
  });

  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const handleSaveDraftRef = useRef(null);

  const statusConfig = STATUS_CONFIG[course?.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const filteredModules = modules.filter((m) => {
    if (!outlineFilter.trim()) return true;
    const q = outlineFilter.toLowerCase();
    return (m.title || "").toLowerCase().includes(q) || (m.lessons || []).some((l) => (l.title || "").toLowerCase().includes(q));
  });

  useEffect(() => {
    if (!courseId || !hasUnsavedChanges) return;
    const timer = setTimeout(() => {
      handleSaveDraftRef.current?.();
    }, 30000);
    return () => clearTimeout(timer);
  }, [courseId, hasUnsavedChanges, modules, form]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!courseId) return;
    setLoadingError(null);
    let cancelled = false;
    const start = Date.now();

    builderGet(courseId)
      .then((res) => {
        if (cancelled) return;
        const elapsed = Date.now() - start;
        const c = res.data || {};
        const mods = res.modules || [];
        if (!c.id && !mods.length) {
          setLoadingError(`API returned empty data after ${elapsed}ms.`);
          return;
        }
        setCourse(c);
        setForm({
          title: c.title || "",
          description: c.description || "",
          category: c.category || "",
          thumbnail_url: c.thumbnail_url || "",
          status: c.status || "draft",
        });
        const enriched = mods.map((m) => ({ ...m, lessons: m.lessons || [] }));
        modulesRef.current = enriched;
        setModules(enriched);
      })
      .catch((err) => {
        if (cancelled) return;
        const elapsed = Date.now() - start;
        setLoadingError(err.message || `Request failed after ${elapsed}ms`);
        toast.error(err.message || `Request failed after ${elapsed}ms`);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, navigate, toast]);

  const refreshCourse = useCallback(() => {
    if (!courseId) return Promise.resolve();
    return builderGet(courseId)
      .then((res) => {
        const c = res.data || {};
        const mods = res.modules || [];
        setCourse(c);
        setForm({
          title: c.title || "",
          description: c.description || "",
          category: c.category || "",
          thumbnail_url: c.thumbnail_url || "",
          status: c.status || "draft",
        });
        const enriched = mods.map((m) => ({ ...m, lessons: m.lessons || [] }));
        modulesRef.current = enriched;
        setModules(enriched);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to refresh course");
      });
  }, [courseId, toast]);

  const buildPayload = useCallback(() => ({
    ...form,
    modules: modules.map((m, idx) => ({
      id: m.isNew ? undefined : m.id,
      title: m.title || "",
      type: m.type || "chapter",
      description: m.description || "",
      order: idx + 1,
      is_visible: m.is_visible ?? true,
      lessons: (m.lessons || []).map((l, lIdx) => ({
        id: l.isNew ? undefined : l.id,
        title: l.title || "",
        type: l.type || "reading",
        description: l.description || l.content || "",
        url: l.url || l.content || "",
        order: lIdx + 1,
        duration: l.duration || null,
        is_required: l.is_required ?? true,
        requiresQuizPass: !!l.requiresQuizPass,
        passingScore: l.passingScore || null,
        quizId: l.quizId || null,
      })),
    })),
  }), [form, modules]);

  const saveNow = useCallback(
    (payload) => {
      if (!courseId) return Promise.resolve();
      setSaving(true);
      setIsSavingDraft(true);
      return builderUpdate(courseId, payload)
        .then((res) => {
          if (res?.success || res?.data?.success) {
            toast.success("Saved");
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            return refreshCourse();
          } else {
            throw new Error(res?.message || res?.data?.message || "Save failed");
          }
        })
        .catch((err) => {
          toast.error(err.message || "Save failed");
          throw err;
        })
        .finally(() => {
          setSaving(false);
          setIsSavingDraft(false);
        });
    },
    [courseId, toast, refreshCourse]
  );

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveNow(buildPayload());
    } catch {
      // error already shown in toast
    }
  }, [saveNow, buildPayload]);

  handleSaveDraftRef.current = handleSaveDraft;

  const handlePublish = useCallback(async () => {
    const payload = buildPayload();
    payload.status = "published";
    payload.title = payload.title.trim();
    if (!payload.title) {
      toast.error("Course title is required");
      return;
    }
    if (!modules.length) {
      toast.error("Add at least one module before publishing");
      return;
    }
    const emptyModule = modules.find((m) => !(m.lessons || []).length);
    if (emptyModule) {
      toast.error(`Module "${emptyModule.title || "Untitled"}" has no lessons`);
      return;
    }
    try {
      await saveNow(payload);
      await publishCourse(courseId);
      toast.success("Course published");
      setHasUnsavedChanges(false);
      navigate("/courses/library");
    } catch {
      // error already shown in toast
    }
  }, [buildPayload, modules, courseId, saveNow, toast, navigate]);

  const addModule = () => {
    const newModule = { id: "new-" + Date.now(), title: "", type: "chapter", order_index: modules.length + 1, lessons: [], isNew: true };
    setModules((prev) => {
      const next = [...prev, newModule];
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
    setSelectedModuleId(newModule.id);
    setSelectedLessonId(null);
  };

  const updateModule = (moduleId, patch) => {
    setModules((prev) => {
      const next = prev.map((m) => (m.id === moduleId ? { ...m, ...patch } : m));
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const removeModule = (moduleId) => {
    setModules((prev) => {
      const next = prev.filter((m) => m.id !== moduleId).map((m, i) => ({ ...m, order_index: i + 1 }));
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
    if (selectedModuleId === moduleId) {
      setSelectedModuleId(null);
      setSelectedLessonId(null);
    }
  };

  const addLesson = (moduleId) => {
    setModules((prev) => {
      const next = prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: [...(m.lessons || []), { id: "new-" + Date.now(), title: "", type: "reading", description: "", url: "", order_index: (m.lessons || []).length + 1, isNew: true }],
        };
      });
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const updateLesson = (moduleId, lessonIndex, patch) => {
    setModules((prev) => {
      const next = prev.map((m) => {
        if (m.id !== moduleId) return m;
        const lessons = [...(m.lessons || [])];
        lessons[lessonIndex] = { ...lessons[lessonIndex], ...patch };
        return { ...m, lessons };
      });
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const removeLesson = (moduleId, lessonIndex) => {
    setModules((prev) => {
      const next = prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: (m.lessons || []).filter((_, i) => i !== lessonIndex).map((l, i) => ({ ...l, order_index: i + 1 })),
        };
      });
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
    setSelectedLessonId(null);
  };

  const moveLessonUp = (moduleId, lessonIndex) => {
    if (lessonIndex <= 0) return;
    setModules((prev) => {
      const next = prev.map((m) => {
        if (m.id !== moduleId) return m;
        const lessons = [...(m.lessons || [])];
        [lessons[lessonIndex - 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex - 1]];
        return { ...m, lessons: lessons.map((l, i) => ({ ...l, order_index: i + 1 })) };
      });
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const moveLessonDown = (moduleId, lessonIndex) => {
    if (lessonIndex >= (modules.find((m) => m.id === moduleId)?.lessons || []).length - 1) return;
    setModules((prev) => {
      const next = prev.map((m) => {
        if (m.id !== moduleId) return m;
        const lessons = [...(m.lessons || [])];
        [lessons[lessonIndex + 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex + 1]];
        return { ...m, lessons: lessons.map((l, i) => ({ ...l, order_index: i + 1 })) };
      });
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const selectedModule = modules.find((m) => m.id === selectedModuleId) || null;
  const selectedLesson = selectedModule?.lessons?.find((l) => l.id === selectedLessonId) || null;

  if (!course && !loadingError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-neutral-500">Loading course...</p>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Course Builder</h1>
          <button onClick={() => navigate("/courses")} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-base hover:border-neutral-300">
            Back to Courses
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-base text-red-700 dark:text-red-200">
          {loadingError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/courses")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{form.title || "Course Builder"}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                <StatusIcon size={12} />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Design modules, lessons, and content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-neutral-400 hidden sm:inline-flex items-center gap-1">
              <Save size={12} />
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {isSavingDraft && (
            <span className="text-xs text-blue-600 dark:text-blue-400 hidden sm:inline-flex items-center gap-1">
              <Clock size={12} />
              Saving...
            </span>
          )}
          <div className="flex items-center gap-1 p-1 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
            <button
              onClick={() => {
                const next = !showLeftSidebar;
                setShowLeftSidebar(next);
                if (next) setShowRightSidebar(false);
              }}
              aria-label={showLeftSidebar ? "Close course outline sidebar" : "Open course outline sidebar"}
              aria-expanded={showLeftSidebar}
              aria-controls="outline-panel"
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium
                transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${showLeftSidebar 
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/60 dark:hover:bg-neutral-700/60'}
              `}
            >
              {showLeftSidebar ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              <span className="hidden sm:inline">{showLeftSidebar ? 'Outline' : 'Outline'}</span>
            </button>
            <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-600 mx-0.5" />
            <button
              onClick={() => {
                const next = !showRightSidebar;
                setShowRightSidebar(next);
                if (next) setShowLeftSidebar(false);
              }}
              aria-label={showRightSidebar ? "Close details sidebar" : "Open details sidebar"}
              aria-expanded={showRightSidebar}
              aria-controls="details-panel"
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium
                transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${showRightSidebar 
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/60 dark:hover:bg-neutral-700/60'}
              `}
            >
              <span className="hidden sm:inline">{showRightSidebar ? 'Details' : 'Details'}</span>
              {showRightSidebar ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        <aside
          className={`
            fixed inset-0 z-50 lg:static lg:inset-auto lg:z-auto lg:shrink-0 lg:bg-transparent lg:dark:bg-transparent
            transition-all duration-200 ease-in-out
            ${showLeftSidebar ? 'block' : 'hidden'}
            lg:block
            ${showLeftSidebar ? 'lg:w-72 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
          `}
        >
          {showLeftSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowLeftSidebar(false)}>
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
              <div className="absolute left-0 top-0 h-full w-3/4 max-w-sm bg-white dark:bg-neutral-900 shadow-xl border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">Course Outline</h2>
                  <button onClick={() => setShowLeftSidebar(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <X size={20} className="text-neutral-500 dark:text-neutral-400" />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <CourseOutline
                    modules={filteredModules}
                    selectedModuleId={selectedModuleId}
                    selectedLessonId={selectedLessonId}
                    onSelectModule={(moduleId) => {
                      setSelectedModuleId(moduleId);
                      setSelectedLessonId(null);
                      setShowLeftSidebar(true);
                      setShowRightSidebar(false);
                    }}
                    onSelectLesson={(moduleId, lessonId) => {
                      setSelectedModuleId(moduleId);
                      setSelectedLessonId(lessonId);
                      setShowLeftSidebar(false);
                      setShowRightSidebar(true);
                    }}
                    onAddModule={addModule}
                    onUpdateModule={updateModule}
                    onRemoveModule={removeModule}
                    onAddLesson={addLesson}
                    onUpdateLesson={updateLesson}
                    onRemoveLesson={removeLesson}
                    onMoveLessonUp={moveLessonUp}
                    onMoveLessonDown={moveLessonDown}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="hidden lg:flex lg:flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden h-full">
            <div className="px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">Course Outline</h2>
                <span className="text-xs text-neutral-500">{modules.length} module{modules.length === 1 ? '' : 's'}</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={outlineFilter}
                  onChange={(e) => setOutlineFilter(e.target.value)}
                  placeholder="Search modules & lessons..."
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-7 pr-2 py-1 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <CourseOutline
                modules={filteredModules}
                selectedModuleId={selectedModuleId}
                selectedLessonId={selectedLessonId}
                onSelectModule={(moduleId) => {
                  setSelectedModuleId(moduleId);
                  setSelectedLessonId(null);
                  setShowLeftSidebar(true);
                  setShowRightSidebar(false);
                }}
                onSelectLesson={(moduleId, lessonId) => {
                  setSelectedModuleId(moduleId);
                  setSelectedLessonId(lessonId);
                  setShowLeftSidebar(false);
                  setShowRightSidebar(true);
                }}
                onAddModule={addModule}
                onUpdateModule={updateModule}
                onRemoveModule={removeModule}
                onAddLesson={addLesson}
                onUpdateLesson={updateLesson}
                onRemoveLesson={removeLesson}
                onMoveLessonUp={moveLessonUp}
                onMoveLessonDown={moveLessonDown}
              />
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {selectedLesson ? (
            <LessonEditor
              lesson={selectedLesson}
              moduleId={selectedModuleId}
              onSave={(patch) => updateLesson(selectedModuleId, modules.find((m) => m.id === selectedModuleId)?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? 0, patch)}
              onDelete={() => removeLesson(selectedModuleId, modules.find((m) => m.id === selectedModuleId)?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? 0)}
              saving={saving}
            />
          ) : selectedModule ? (
            <ModuleEditor
              module={selectedModule}
              onSave={updateModule}
              onDelete={() => removeModule(selectedModuleId)}
              saving={saving}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center space-y-3 max-w-sm">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket size={28} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">Start Building Your Course</h3>
                <p className="text-base text-neutral-500 dark:text-neutral-400">Select a module or lesson from the outline to edit, or create a new one to get started.</p>
                <button
                  type="button"
                  onClick={addModule}
                  className="rounded-md border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-base hover:border-neutral-300 dark:hover:border-neutral-600 transition-all"
                >
                  + Add your first module
                </button>
              </div>
            </div>
          )}
        </main>

        <aside
          className={`
            fixed inset-0 z-50 bg-black/50 dark:bg-black/60 lg:static lg:inset-auto lg:z-auto lg:shrink-0 lg:bg-transparent lg:dark:bg-transparent
            transition-all duration-200 ease-in-out
            ${showRightSidebar ? 'block' : 'hidden'}
            lg:block
            ${showRightSidebar ? 'lg:w-72 lg:opacity-100' : 'lg:w-0 lg:overflow-hidden lg:opacity-0'}
          `}
        >
          {showRightSidebar && (
            <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowRightSidebar(false)}>
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
              <div className="absolute right-0 top-0 h-full w-3/4 max-w-sm bg-white dark:bg-neutral-900 shadow-xl border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">Details</h2>
                  <button onClick={() => setShowRightSidebar(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <X size={20} className="text-neutral-500 dark:text-neutral-400" />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                  <PublishReadiness course={course} modules={modules} />
                  <div className="flex flex-col gap-2">
                    <button onClick={handleSaveDraft} disabled={saving} className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 text-sm hover:border-neutral-300 dark:hover:border-neutral-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                      <Save size={14} />
                      {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button onClick={handlePublish} disabled={saving} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                      <Rocket size={14} />
                      {saving ? "Publishing..." : "Publish"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="hidden lg:flex lg:flex-col gap-3 h-full overflow-y-auto">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">Publish Readiness</h2>
              </div>
              <div className="p-4">
                <PublishReadiness course={course} modules={modules} />
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm p-4 space-y-2">
              <button onClick={handleSaveDraft} disabled={saving} className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-2 text-sm hover:border-neutral-300 dark:hover:border-neutral-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                <Save size={14} />
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button onClick={handlePublish} disabled={saving} className="w-full rounded-md bg-blue-600 px-2.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                <Rocket size={14} />
                {saving ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
