import { useState, useEffect } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Loader2 } from "lucide-react";
import ModuleAccordion from "./ModuleAccordion";
import RichTextEditor from "@/features/sop-management/components/SOPEditor/RichTextEditor";

export default function CourseFormModal({ open, onClose, onSubmit, loading, initialData }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    thumbnail_url: "",
    status: "draft",
    modules: [],
  });

  useEffect(() => {
    if (open && initialData) {
      setForm({
        title: initialData.title || "",
        description: initialData.description || "",
        category: initialData.category || "",
        thumbnail_url: initialData.thumbnail_url || "",
        status: initialData.status || "draft",
        modules: initialData.modules || [],
      });
    } else if (open) {
      setForm({ title: "", description: "", category: "", thumbnail_url: "", status: "draft", modules: [] });
    }
  }, [open, initialData]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const addModule = () => {
    setForm((prev) => ({
      ...prev,
      modules: [...prev.modules, { title: "", lessons: [] }],
    }));
  };

  const updateModule = (moduleId, patch) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)),
    }));
  };

  const removeModule = (moduleId) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.filter((m) => m.id !== moduleId),
    }));
  };

  const addLesson = (moduleId) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: [...m.lessons, { title: "", type: "reading", content: "", order: m.lessons.length + 1 }],
        };
      }),
    }));
  };

  const updateLesson = (moduleId, lessonIndex, patch) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => {
        if (m.id !== moduleId) return m;
        const lessons = [...m.lessons];
        lessons[lessonIndex] = { ...lessons[lessonIndex], ...patch };
        return { ...m, lessons };
      }),
    }));
  };

  const removeLesson = (moduleId, lessonIndex) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => {
        if (m.id !== moduleId) return m;
        return { ...m, lessons: m.lessons.filter((_, idx) => idx !== lessonIndex) };
      }),
    }));
  };

  const moveLessonUp = (moduleId, lessonIndex) => {
    if (lessonIndex <= 0) return;
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => {
        if (m.id !== moduleId) return m;
        const lessons = [...m.lessons];
        [lessons[lessonIndex - 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex - 1]];
        return { ...m, lessons };
      }),
    }));
  };

  const moveLessonDown = (moduleId, lessonIndex) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => {
        if (m.id !== moduleId) return m;
        const lessons = [...m.lessons];
        if (lessonIndex >= lessons.length - 1) return m;
        [lessons[lessonIndex + 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex + 1]];
        return { ...m, lessons };
      }),
    }));
  };

  const handleSubmit = (status) => {
    const payload = {
      ...form,
      status: status || "draft",
      modules: form.modules.map((m, idx) => ({
        ...m,
        order: idx + 1,
        lessons: m.lessons.map((l, lIdx) => ({ ...l, order: lIdx + 1 })),
      })),
    };
    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <Modal open={open} title={initialData ? "Edit Course" : "New Course"} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Course Title <span className="text-red-500">*</span></label>
            <Input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. Advanced Workplace Safety"
              className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
            <RichTextEditor
              value={form.description}
              onChange={(html) => updateField("description", html)}
              placeholder="What will learners accomplish in this course?"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Category</label>
              <Input
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                placeholder="e.g. Safety, Compliance"
                className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Thumbnail URL</label>
              <Input
                value={form.thumbnail_url}
                onChange={(e) => updateField("thumbnail_url", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Modules</h3>
            <button type="button" onClick={addModule} className="text-xs rounded-md border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 hover:border-neutral-300">
              + Add Module
            </button>
          </div>
          <div className="space-y-2">
            {form.modules.map((mod, idx) => (
              <ModuleAccordion
                key={mod.id || idx}
                module={mod}
                modulesCount={idx}
                onUpdate={(patch) => updateModule(mod.id || idx, patch)}
                onRemove={() => removeModule(mod.id || idx)}
                onAddLesson={() => addLesson(mod.id || idx)}
                onUpdateLesson={updateLesson}
                onRemoveLesson={removeLesson}
                onMoveLessonUp={moveLessonUp}
                onMoveLessonDown={moveLessonDown}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700">
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit("draft")}
            disabled={loading || !form.title?.trim()}
            variant="outline"
            className="border-neutral-200 dark:border-neutral-700"
          >
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit("published")}
            disabled={loading || !form.title?.trim()}
            className="shadow-sm hover:shadow-md transition-all"
          >
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            Publish Course
          </Button>
        </div>
      </div>
    </Modal>
  );
}
