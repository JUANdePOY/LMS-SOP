import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Plus, Loader2, X } from "lucide-react";

export default function CreateQuizModal({ courses, loadingCourses, saving, onSave, onCancel }) {
  const [form, setForm] = useState({
    courseId: "",
    title: "",
    quiz_type: "practice",
    time_limit: "",
    passing_score: "",
    description: "",
  });

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.courseId || !form.title.trim()) return;
    onSave({
      courseId: Number(form.courseId),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      quiz_type: form.quiz_type,
      time_limit: form.time_limit ? Number(form.time_limit) : null,
      passing_score: form.passing_score ? Number(form.passing_score) : null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">Create Quiz</h3>
        <button onClick={onCancel} className="text-neutral-500 hover:text-neutral-700">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Course *</label>
          <select
            required
            value={form.courseId}
            onChange={(e) => setField("courseId", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
            disabled={loadingCourses}
          >
            <option value="">Select a course</option>
            {loadingCourses ? (
              <option disabled>Loading courses…</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title || c.name}</option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
            placeholder="e.g. Security Fundamentals Final"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Quiz Type</label>
          <select value={form.quiz_type} onChange={(e) => setField("quiz_type", e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm">
            <option value="practice">Practice</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Time Limit (minutes)</label>
          <input type="number" min={0} value={form.time_limit} onChange={(e) => setField("time_limit", e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm" placeholder="Leave blank for none" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Passing Score (%)</label>
          <input type="number" min={0} max={100} value={form.passing_score} onChange={(e) => setField("passing_score", e.target.value)} className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm" placeholder="e.g. 70" />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm" placeholder="Optional description shown to students" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !form.courseId || !form.title.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Creating…</> : <><Plus className="h-4 w-4 mr-1" />Create Quiz</>}
          </Button>
        </div>
      </form>
    </div>
  );
}