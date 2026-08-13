import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Plus, Loader2, X } from "lucide-react";

const TIME_LIMIT_OPTIONS = [
  { value: 0, label: "No limit" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1 hour 30 minutes" },
  { value: 120, label: "2 hours" },
];

export default function CreateQuizModal({ open, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const formData = Object.fromEntries(fd.entries());

    if (!formData.title?.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description?.trim(),
        timeLimit: formData.timeLimit ? Number(formData.timeLimit) : 0,
      });
      onClose();
    } catch (err) {
      console.error(err);
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
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="title">Quiz Title *</label>
            <input
              id="title"
              name="title"
              placeholder="Enter quiz title"
              required
              autoFocus
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-[var(--color-primary)] dark:focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] dark:focus:ring-blue-400/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional description for this quiz"
              rows={3}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-[var(--color-primary)] dark:focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] dark:focus:ring-blue-400/20 outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5" htmlFor="timeLimit">Time Limit</label>
            <select
              id="timeLimit"
              name="timeLimit"
              defaultValue="0"
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-[var(--color-primary)] dark:focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] dark:focus:ring-blue-400/20 outline-none"
            >
              {TIME_LIMIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <Button variant="outline" size="sm" onClick={onClose} type="button">
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Quiz
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}