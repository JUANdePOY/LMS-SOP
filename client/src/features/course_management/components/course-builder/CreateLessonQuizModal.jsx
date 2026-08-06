import { useState } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { createQuiz } from "@/features/assessments/api/quiz.api";

/**
 * In-editor quiz creation modal for the lesson editor.
 * Creates a quiz strictly scoped to `courseId`, then reports the new quiz
 * back via `onCreated` so the lesson can auto-select it. Reuses the project's
 * blue/neutral visual language for consistency with CreateQuizModal.
 */
export default function CreateLessonQuizModal({ open, onClose, courseId, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const formData = Object.fromEntries(fd.entries());
    const title = formData.title?.trim();
    if (!title) return;

    setLoading(true);
    setError(null);
    try {
      const res = await createQuiz(courseId, {
        title,
        description: formData.description?.trim() || "",
        timeLimit: formData.timeLimit ? Number(formData.timeLimit) : 0,
        status: "draft",
      });
      const created = res?.data || res;
      onCreated?.({
        id: created?.id,
        title,
        description: formData.description?.trim() || "",
        course_id: courseId,
        status: "draft",
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Create Quiz</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="lesson-quiz-title">
              Quiz Title *
            </label>
            <input
              id="lesson-quiz-title"
              name="title"
              placeholder="Enter quiz title"
              required
              autoFocus
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="lesson-quiz-desc">
              Description
            </label>
            <textarea
              id="lesson-quiz-desc"
              name="description"
              placeholder="Optional description for this quiz"
              rows={3}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="lesson-quiz-time">
              Time Limit (minutes)
            </label>
            <input
              id="lesson-quiz-time"
              name="timeLimit"
              type="number"
              placeholder="0 for no limit"
              min="0"
              defaultValue="0"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <p className="text-xs text-neutral-400">
            Quiz is created in this course. Add questions in the Quiz Builder, then return here to attach it.
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Quiz
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
