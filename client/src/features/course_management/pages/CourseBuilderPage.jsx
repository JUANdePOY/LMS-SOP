import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/shared/components/ui/Toast";
import CourseOutline from "../components/course-builder/CourseOutline";
import LessonEditor from "../components/course-builder/LessonEditor";
import ModuleEditor from "../components/course-builder/ModuleEditor";
import PublishReadiness from "../components/course-builder/PublishReadiness";
import { builderGet, builderUpdate, publishCourse } from "../api/course.api";

export default function CourseBuilderPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingStructural, setSavingStructural] = useState(false);
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const modulesRef = useRef([]);
  const [dirty, setDirty] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    thumbnail_url: "",
    status: "draft",
  });

  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  const saveTimer = useRef(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (!courseId) return;
    leaving.current = false;
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
        setDirty(false);
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
        const prevModuleId = selectedModuleId;
        const prevLessonId = selectedLessonId;
        const prevModuleIdx = modulesRef.current.findIndex((m) => m.id === prevModuleId);
        const prevLessonIdx = prevModuleIdx >= 0 ? (modulesRef.current[prevModuleIdx].lessons || []).findIndex((l) => l.id === prevLessonId) : -1;
        const enriched = mods.map((m) => ({ ...m, lessons: m.lessons || [] }));
        modulesRef.current = enriched;
        setModules(enriched);
        if (prevModuleIdx >= 0 && enriched[prevModuleIdx]) {
          setSelectedModuleId(enriched[prevModuleIdx].id);
          if (prevLessonIdx >= 0 && enriched[prevModuleIdx].lessons[prevLessonIdx]) {
            setSelectedLessonId(enriched[prevModuleIdx].lessons[prevLessonIdx].id);
          } else {
            setSelectedLessonId(null);
          }
        } else {
          setSelectedModuleId(null);
          setSelectedLessonId(null);
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to refresh course");
      });
  }, [courseId, toast, selectedModuleId, selectedLessonId]);

  const autosave = useCallback(
    (payload) => {
      if (!courseId) return Promise.resolve();
      setSavingStructural(true);
      return builderUpdate(courseId, payload)
        .then((res) => {
          if (res?.success || res?.data?.success) {
            setDirty(false);
            return refreshCourse();
          } else {
            throw new Error(res?.message || res?.data?.message || "Save failed");
          }
        })
        .catch((err) => {
          toast.error(err.message || "Save failed");
          throw err;
        })
        .finally(() => setSavingStructural(false));
    },
    [courseId, toast, refreshCourse]
  );

  const debouncedAutosave = useCallback(
    (payload) => {
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => autosave(payload), 600);
    },
    [autosave]
  );

  const handleSaveDraft = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await autosave(buildPayload());
      toast.success("Draft saved");
    } catch (err) {
      toast.error(err.message || "Failed to save draft");
    }
  };

  const handlePublish = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const payload = buildPayload();
    payload.status = "published";
    payload.title = payload.title.trim();
    if (!payload.title) {
      toast.error("Course title is required");
      return;
    }
    if (!modulesRef.current.length) {
      toast.error("Add at least one module before publishing");
      return;
    }
    const emptyModule = modulesRef.current.find((m) => !(m.lessons || []).length);
    if (emptyModule) {
      toast.error(`Module "${emptyModule.title || "Untitled"}" has no lessons`);
      return;
    }
    setSaving(true);
    try {
      await autosave(payload);
      await publishCourse(courseId);
      toast.success("Course published");
      setDirty(false);
    } catch (err) {
      toast.error(err.message || "Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      debouncedAutosave({ ...next, modules: modulesRef.current });
      return next;
    });
  };

  const addModule = () => {
    setModules((prev) => {
      const next = [...prev, { id: "new-" + Date.now(), title: "", type: "chapter", order_index: prev.length + 1, lessons: [], isNew: true }];
      modulesRef.current = next;
      debouncedAutosave({ ...form, modules: next });
      return next;
    });
    setSelectedModuleId(null);
    setSelectedLessonId(null);
  };

  const updateModule = (moduleId, patch) => {
    setModules((prev) => {
      const next = prev.map((m) => (m.id === moduleId ? { ...m, ...patch } : m));
      modulesRef.current = next;
      debouncedAutosave({ ...form, modules: next });
      return next;
    });
  };

  const removeModule = (moduleId) => {
    setModules((prev) => {
      const next = prev.filter((m) => m.id !== moduleId).map((m, i) => ({ ...m, order_index: i + 1 }));
      modulesRef.current = next;
      debouncedAutosave({ ...form, modules: next });
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
          lessons: [...(m.lessons || []), { id: "new-" + Date.now(), title: "", type: "text", description: "", url: "", order_index: (m.lessons || []).length + 1, isNew: true }],
        };
      });
      modulesRef.current = next;
      debouncedAutosave({ ...form, modules: next });
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
      debouncedAutosave({ ...form, modules: next });
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
      debouncedAutosave({ ...form, modules: next });
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
      debouncedAutosave({ ...form, modules: next });
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
      debouncedAutosave({ ...form, modules: next });
      return next;
    });
  };

  const buildPayload = () => ({
    ...form,
    modules: modulesRef.current.map((m, idx) => ({
      id: m.isNew ? undefined : m.id,
      title: m.title || "",
      type: m.type || "chapter",
      description: m.description || "",
      order: idx + 1,
      is_visible: m.is_visible ?? true,
      lessons: (m.lessons || []).map((l, lIdx) => ({
        id: l.isNew ? undefined : l.id,
        title: l.title || "",
        type: l.type || "text",
        description: l.description || l.content || "",
        url: l.url || l.content || "",
        order: lIdx + 1,
        duration: l.duration || null,
        is_required: l.is_required ?? true,
        requiresQuizPass: !!l.requiresQuizPass,
        passingScore: l.passingScore || null,
      })),
    })),
  });

  const selectedModule = modules.find((m) => m.id === selectedModuleId) || null;
  const selectedLesson = selectedModule?.lessons?.find((l) => l.id === selectedLessonId) || null;

  if (!course && !loadingError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Course Builder</h1>
          <button onClick={() => navigate("/courses")} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-300">
            Back to Courses
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-200">
          {loadingError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-white dark:bg-neutral-900 px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{form.title || "Course Builder"}</h1>
          <p className="text-[10px] text-neutral-500 truncate">Design modules, lessons, and content</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-neutral-500 flex items-center gap-1">
            {savingStructural || saving ? (
              <>
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-blue-600" />
                Saving...
              </>
            ) : dirty ? (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                Unsaved changes
              </>
            ) : (
              <>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                All changes saved
              </>
            )}
          </span>
          <button onClick={() => navigate("/courses")} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300">
            Back
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-64 shrink-0">
          <CourseOutline
            modules={modules}
            selectedModuleId={selectedModuleId}
            selectedLessonId={selectedLessonId}
            onSelectModule={(moduleId) => {
              setSelectedModuleId(moduleId);
              setSelectedLessonId(null);
            }}
            onSelectLesson={(moduleId, lessonId) => {
              setSelectedModuleId(moduleId);
              setSelectedLessonId(lessonId);
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
        <div className="flex-1 min-w-0 bg-neutral-50 dark:bg-neutral-800/50">
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
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              <div className="text-center space-y-2">
                <p>Select a module or lesson from the outline to start editing.</p>
                <button
                  type="button"
                  onClick={addModule}
                  className="rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300"
                >
                  + Add your first module
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-white dark:bg-neutral-900 px-4 py-2">
        <PublishReadiness course={course} modules={modules} />
        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} disabled={saving || savingStructural} className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs hover:border-neutral-300 disabled:opacity-50">
            {saving || savingStructural ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={handlePublish} disabled={saving || savingStructural} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving || savingStructural ? "Publishing..." : "Publish Course"}
          </button>
        </div>
      </div>
    </div>
  );
}
