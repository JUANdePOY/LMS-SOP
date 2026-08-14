import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/shared/components/ui/Toast";
import { ChevronLeft, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, X, Save, Rocket, Clock, CheckCircle2, AlertCircle, Search, Plus, Layers, FileText, HelpCircle, BookOpen, ListChecks } from "lucide-react";
import CourseOutline from "../components/course-builder/CourseOutline";
import LessonEditor from "../components/course-builder/LessonEditor";
import ModuleEditor from "../components/course-builder/ModuleEditor";
import PublishReadiness from "../components/course-builder/PublishReadiness";
import CourseCertificatesSection from "../components/course-builder/CourseCertificatesSection";
import { builderGet, builderUpdate, publishCourse } from "../api/course.api";
import { listCourseCertificates, linkCertificateToCourse, unlinkCertificateFromCourse } from "../api/certificateCourseLink.api";
import { enqueueBanner } from "@/shared/stores/notificationStore.js";
import * as session from "@/services/session";
import { useAuth } from "@/contexts/AuthContext";
import { FadeIn } from "@/shared/motion";

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleSopLink(res) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      const error = new Error(json?.message || json?.error || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.code = json?.code;
      throw error;
    }
    return json;
  } catch {
    if (!res.ok) {
      const error = new Error(text || res.statusText);
      error.status = res.status;
      throw error;
    }
    return { message: text || res.statusText };
  }
}

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300", icon: Clock },
  published: { label: "Published", color: "bg-success-soft text-[var(--color-success)] dark:bg-success-soft dark:text-[var(--color-success)]", icon: CheckCircle2 },
  archived: { label: "Archived", color: "bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft dark:text-[var(--color-warning)]", icon: AlertCircle },
};

function BuilderEmptyState({ modules, onAddModule, onSelectModule }) {
  const moduleCount = modules.length;
  const lessonCount = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const emptyModules = modules.filter((m) => !(m.lessons?.length)).length;

  const stats = [
    { Icon: Layers, label: "Modules", value: moduleCount },
    { Icon: FileText, label: "Lessons", value: lessonCount },
    { Icon: HelpCircle, label: "Empty modules", value: emptyModules },
  ];

  const hero = moduleCount === 0
    ? {
        title: "Start Building Your Course",
        desc: "Organize your content into modules and lessons. Create your first module to get going, then add lessons inside it.",
        cta: "Add your first module",
      }
    : lessonCount === 0
      ? {
          title: "Add Lessons to Your Modules",
          desc: "You've created modules — now fill them with lessons. Pick a module below to start adding video, reading, quiz, or other content.",
          cta: "Open a module",
        }
      : {
          title: "Your Course Is Taking Shape",
          desc: "You have modules and lessons in place. Keep refining the content, or open any module from the list below to continue editing.",
          cta: "Continue editing",
        };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-neutral-50/80 to-neutral-100/80 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-700 px-8 pt-10 pb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)] shadow-lg shadow-[rgba(242,92,5,0.20)]">
              <Rocket size={28} className="text-white" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{hero.title}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">{hero.desc}</p>
            <button
              type="button"
              onClick={moduleCount === 0 ? onAddModule : () => onSelectModule(modules[0]?.id)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover-brand active:bg-[var(--color-primary-active)]"
            >
              <Plus size={16} />
              {hero.cta}
            </button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center justify-center gap-3 px-6 py-5">
              <Layers size={18} className="text-[var(--text-secondary)]" />
              <div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{moduleCount}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Modules</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 px-6 py-5">
              <FileText size={18} className="text-[var(--text-secondary)]" />
              <div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{lessonCount}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Lessons</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 px-6 py-5">
              <HelpCircle size={18} className="text-[var(--text-secondary)]" />
              <div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{emptyModules}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Empty modules</p>
              </div>
            </div>
          </div>
        </div>

        {moduleCount > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                <BookOpen size={16} className="text-[var(--text-secondary)]" />
                Course outline
              </h4>
              <button
                type="button"
                onClick={onAddModule}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Plus size={14} />
                Add module
              </button>
            </div>
            <ul className="space-y-2">
              {modules.map((m) => {
                const lessons = m.lessons || [];
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelectModule(m.id)}
                      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                          <Layers size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{m.title || "Untitled module"}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                            <ListChecks size={12} />
                            {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200">Open</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CourseBuilderPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEmployee } = useAuth();
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
  const [courseCertificates, setCourseCertificates] = useState([]);
  const courseCertificatesRef = useRef([]);

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
  const selectedModuleIdRef = useRef(selectedModuleId);
  const selectedLessonIdRef = useRef(selectedLessonId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const handleSaveDraftRef = useRef(null);

  useEffect(() => {
    selectedModuleIdRef.current = selectedModuleId;
  }, [selectedModuleId]);

  useEffect(() => {
    selectedLessonIdRef.current = selectedLessonId;
  }, [selectedLessonId]);

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

   useEffect(() => {
     if (!courseId) return;
     listCourseCertificates(courseId)
       .then((res) => {
         const data = res?.data?.data || res?.data || res || [];
         setCourseCertificates(Array.isArray(data) ? data : []);
         courseCertificatesRef.current = Array.isArray(data) ? data : [];
       })
       .catch(() => {
         setCourseCertificates([]);
         courseCertificatesRef.current = [];
       });
   }, [courseId]);

  const refreshCourse = useCallback(() => {
    if (!courseId) return Promise.resolve();
    const prevModules = modulesRef.current;
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

        // If the currently selected module/lesson had a temp client-side id
        // (module or lesson not yet saved when the user selected it), remap the
        // selection to the real id the server just assigned, by position,
        // so the editor doesn't silently lose the selection after a save
        // and the module doesn't keep looking "unsaved".
        const newModuleId = (() => {
          const current = selectedModuleIdRef.current;
          if (!current) return current;
          if (enriched.some((m) => m.id === current)) return current;
          const prevIdx = prevModules.findIndex((m) => m.id === current);
          return prevIdx >= 0 ? enriched[prevIdx]?.id ?? current : current;
        })();

        const newLessonId = (() => {
          const current = selectedLessonIdRef.current;
          if (!current) return current;
          for (const m of enriched) {
            if ((m.lessons || []).some((l) => l.id === current)) return current;
          }
          const prevModule = prevModules.find((m) => (m.lessons || []).some((l) => l.id === current));
          if (!prevModule) return current;
          const prevModuleIdx = prevModules.findIndex((m) => m.id === prevModule.id);
          const newModule = enriched[prevModuleIdx];
          if (!newModule) return current;
          const lessonIdx = (prevModule.lessons || []).findIndex((l) => l.id === current);
          return lessonIdx >= 0 ? (newModule.lessons || [])[lessonIdx]?.id ?? current : current;
        })();

        setSelectedModuleId(newModuleId);
        setSelectedLessonId(newLessonId);
      })
      .then(async () => {
        try {
          const certRes = await listCourseCertificates(courseId);
          const certData = certRes?.data?.data || certRes?.data || certRes || [];
          const certs = Array.isArray(certData) ? certData : [];
          setCourseCertificates(certs);
          courseCertificatesRef.current = certs;
        } catch {
          // certificates refresh failed, keep existing state
        }
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
        linkTitle: l.linkTitle || null,
        order: lIdx + 1,
        duration: l.duration || null,
        is_required: l.is_required ?? true,
        requiresQuizPass: !!l.requiresQuizPass,
        passingScore: l.passingScore || null,
        quizId: l.quizId || null,
        thumbnail_url: l.thumbnail_url || l.thumbnailUrl || null,
      })),
    })),
  }), [form, modules]);

  const syncCourseCertificates = async () => {
    if (!courseId) return;
    const previous = courseCertificatesRef.current || [];
    const current = courseCertificates;

    const previousIds = new Set(previous.map((c) => c.certificate_template_id));
    const currentIds = new Set(current.map((c) => c.certificate_template_id));

    const toAdd = current.filter((c) => !previousIds.has(c.certificate_template_id));
    const toRemove = previous.filter((c) => !currentIds.has(c.certificate_template_id));

    for (const cert of toAdd) {
      try {
        await linkCertificateToCourse(courseId, cert.certificate_template_id, {
          is_default: cert.is_default,
          display_order: cert.display_order,
        });
      } catch (err) {
        if (err && err.code !== "DUPLICATE_LINK") {
          toast.error(err.message || "Failed to link certificate");
        }
      }
    }

    for (const cert of toRemove) {
      try {
        await unlinkCertificateFromCourse(courseId, cert.certificate_template_id);
      } catch (err) {
        toast.error(err.message || "Failed to unlink certificate");
      }
    }

    courseCertificatesRef.current = current;
  };

  const syncCourseData = async () => {
    await syncCourseCertificates();
  };

  const saveNow = useCallback(
    (payload) => {
      if (!courseId) return Promise.resolve();
      setSaving(true);
      setIsSavingDraft(true);
      return builderUpdate(courseId, payload)
        .then(async (res) => {
          if (res?.success || res?.data?.success) {
            toast.success("Saved");
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            await syncCourseData();
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
    [courseId, toast, refreshCourse, syncCourseData]
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
      if (!isEmployee) {
        enqueueBanner({
          id: `new-course-${courseId}`,
          type: "new_course",
          title: "New Course Published",
          message: title.trim() || "A new course is now available.",
          link: `/courses/library/${courseId}`,
          ctaLabel: "Check course",
          priority: 1,
          persistDismiss: true,
        });
      }
      setHasUnsavedChanges(false);
      navigate("/courses/library");
    } catch {
      // error already shown in toast
    }
  }, [buildPayload, modules, courseId, saveNow, toast, navigate, isEmployee]);

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

  const moveModule = (moduleId, dir) => {
    const idx = modules.findIndex((m) => m.id === moduleId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= modules.length) return;
    setModules((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      const reordered = next.map((m, i) => ({ ...m, order_index: i + 1 }));
      modulesRef.current = reordered;
      setHasUnsavedChanges(true);
      return reordered;
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
    const newLessonId = "new-" + Date.now();
    setModules((prev) => {
      const next = prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: [...(m.lessons || []), { id: newLessonId, title: "", type: "reading", description: "", url: "", order_index: (m.lessons || []).length + 1, isNew: true }],
        };
      });
      modulesRef.current = next;
      setHasUnsavedChanges(true);
      return next;
    });
    setSelectedModuleId(moduleId);
    setSelectedLessonId(newLessonId);
    setShowLeftSidebar(false);
    setShowRightSidebar(true);
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

  const flatLessons = modules.flatMap((m) =>
    (m.lessons || []).map((l) => ({ lesson: l, moduleId: m.id }))
  );
  const lessonNavIndex = flatLessons.findIndex((item) => item.lesson.id === selectedLessonId);

  const selectLessonById = (lessonId) => {
    const hit = flatLessons.find((item) => item.lesson.id === lessonId);
    if (!hit) return;
    setSelectedModuleId(hit.moduleId);
    setSelectedLessonId(lessonId);
    setShowLeftSidebar(false);
    setShowRightSidebar(true);
  };
  const navLessonPrev = () => {
    if (lessonNavIndex > 0) selectLessonById(flatLessons[lessonNavIndex - 1].lesson.id);
  };
  const navLessonNext = () => {
    if (lessonNavIndex < flatLessons.length - 1) selectLessonById(flatLessons[lessonNavIndex + 1].lesson.id);
  };

  if (!course && !loadingError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
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
            onClick={() => {
              window.dispatchEvent(new Event('open-system-sidebar'));
              navigate("/courses");
            }}
            title="Back to courses"
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
            <span className="text-xs text-[var(--color-primary)] dark:text-[var(--color-primary)] hidden sm:inline-flex items-center gap-1">
              <Clock size={12} />
              Saving...
            </span>
          )}
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-1 ml-2">
            <button
              onClick={() => {
                const next = !showLeftSidebar;
                setShowLeftSidebar(next);
                if (next) setShowRightSidebar(false);
              }}
              aria-label={showLeftSidebar ? "Close course outline sidebar" : "Open course outline sidebar"}
              aria-pressed={showLeftSidebar}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2
                ${showLeftSidebar
                  ? 'btn-primary shadow-sm'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700'}
              `}
            >
              {showLeftSidebar ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              <span>Outline</span>
            </button>
            <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600 mx-0.5" />
            <button
              onClick={() => {
                const next = !showRightSidebar;
                setShowRightSidebar(next);
                if (next) setShowLeftSidebar(false);
              }}
              aria-label={showRightSidebar ? "Close details sidebar" : "Open details sidebar"}
              aria-pressed={showRightSidebar}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2
                ${showRightSidebar
                  ? 'btn-primary shadow-sm'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700'}
              `}
            >
              {showRightSidebar ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              <span>Details</span>
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
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowLeftSidebar(false)} />
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

        <FadeIn as="main" className="flex-1 min-w-0">
          {selectedLesson ? (
            <LessonEditor
              lesson={selectedLesson}
              courseId={courseId}
              courseTitle={course?.title}
              onOpenQuizBuilder={(quizId) => navigate(`/assessments/quiz/${quizId}`)}
              moduleId={selectedModuleId}
              onSave={(patch) => updateLesson(selectedModuleId, modules.find((m) => m.id === selectedModuleId)?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? 0, patch)}
              onDelete={() => removeLesson(selectedModuleId, modules.find((m) => m.id === selectedModuleId)?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? 0)}
              onNavigatePrev={navLessonPrev}
              onNavigateNext={navLessonNext}
              canNavigatePrev={lessonNavIndex > 0}
              canNavigateNext={lessonNavIndex < flatLessons.length - 1}
              onMoveUp={() => moveLessonUp(selectedModuleId, modules.find((m) => m.id === selectedModuleId)?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? 0)}
              onMoveDown={() => moveLessonDown(selectedModuleId, modules.find((m) => m.id === selectedModuleId)?.lessons?.findIndex((l) => l.id === selectedLessonId) ?? 0)}
              canMoveUp={lessonNavIndex > 0}
              canMoveDown={lessonNavIndex < flatLessons.length - 1}
              saving={saving}
            />
          ) : selectedModule ? (
            <ModuleEditor
              module={selectedModule}
              onSave={updateModule}
              onDelete={() => removeModule(selectedModuleId)}
              saving={saving}
              courseId={courseId}
              onMoveUp={() => moveModule(selectedModuleId, -1)}
              onMoveDown={() => moveModule(selectedModuleId, 1)}
              onNavigatePrev={() => {
                const idx = modules.findIndex((m) => m.id === selectedModuleId);
                if (idx > 0) {
                  setSelectedModuleId(modules[idx - 1].id);
                  setSelectedLessonId(null);
                }
              }}
              onNavigateNext={() => {
                const idx = modules.findIndex((m) => m.id === selectedModuleId);
                if (idx < modules.length - 1) {
                  setSelectedModuleId(modules[idx + 1].id);
                  setSelectedLessonId(null);
                }
              }}
              canMoveUp={modules.findIndex((m) => m.id === selectedModuleId) > 0}
              canMoveDown={(() => {
                const idx = modules.findIndex((m) => m.id === selectedModuleId);
                return idx >= 0 && idx < modules.length - 1;
              })()}
              canNavigatePrev={modules.findIndex((m) => m.id === selectedModuleId) > 0}
              canNavigateNext={(() => {
                const idx = modules.findIndex((m) => m.id === selectedModuleId);
                return idx >= 0 && idx < modules.length - 1;
              })()}
            />
          ) : (
            <BuilderEmptyState
              modules={modules}
              onAddModule={addModule}
              onSelectModule={(id) => {
                setSelectedModuleId(id);
                setSelectedLessonId(null);
                setShowLeftSidebar(true);
                setShowRightSidebar(false);
              }}
            />
          )}
        </FadeIn>

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
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowRightSidebar(false)} />
              <div className="absolute right-0 top-0 h-full w-3/4 max-w-sm bg-white dark:bg-neutral-900 shadow-xl border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">Details</h2>
                  <button onClick={() => setShowRightSidebar(false)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    <X size={20} className="text-neutral-500 dark:text-neutral-400" />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                  <PublishReadiness course={course} modules={modules} />
                  <CourseCertificatesSection
                    courseId={courseId}
                    certificates={courseCertificates}
                    saving={saving}
                    onLink={(templateId, meta) => {
                      setCourseCertificates((prev) => [...prev, { id: 'temp-' + Date.now() + '-' + templateId, certificate_template_id: templateId, ...meta }]);
                      setHasUnsavedChanges(true);
                    }}
                    onUnlink={(templateId) => {
                      setCourseCertificates((prev) => prev.filter((c) => c.certificate_template_id !== templateId));
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <button onClick={handleSaveDraft} disabled={saving} className="rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 text-sm hover:border-neutral-300 dark:hover:border-neutral-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                      <Save size={14} />
                      {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button onClick={handlePublish} disabled={saving} className="rounded-md bg-[var(--color-primary)] px-2.5 py-1.5 text-sm font-medium text-white hover-brand disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
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
            <CourseCertificatesSection
              courseId={courseId}
              certificates={courseCertificates}
              saving={saving}
              onLink={(templateId, meta) => {
                setCourseCertificates((prev) => [...prev, { id: 'temp-' + Date.now() + '-' + templateId, certificate_template_id: templateId, ...meta }]);
                setHasUnsavedChanges(true);
              }}
              onUnlink={(templateId) => {
                setCourseCertificates((prev) => prev.filter((c) => c.certificate_template_id !== templateId));
                setHasUnsavedChanges(true);
              }}
            />
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm p-4 space-y-2">
              <button onClick={handleSaveDraft} disabled={saving} className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-2 text-sm hover:border-neutral-300 dark:hover:border-neutral-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                <Save size={14} />
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button onClick={handlePublish} disabled={saving} className="w-full rounded-md bg-[var(--color-primary)] px-2.5 py-2 text-sm font-medium text-white hover-brand disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
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