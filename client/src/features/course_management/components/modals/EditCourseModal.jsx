import { useEffect } from "react";
import RichTextEditor from "../rich-text/RichTextEditor";
import { STATUS_META, DIFFICULTY_META, DIFFICULTIES } from "@/features/course_management/constants";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { X, Loader2 } from "lucide-react";

export default function EditCourseModal({
  open,
  onClose,
  course,
  formData,
  updateField,
  richContent,
  setRichContent,
  onSubmit,
  loading,
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!open || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Edit Course</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Update course details and settings.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-all" aria-label="Exit" title="Exit (ESC)">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Course Title <span className="text-red-500">*</span></label>
            <Input value={formData?.title || ''} onChange={(e) => updateField?.('title', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
            <RichTextEditor
              value={richContent || formData?.description || ''}
              onChange={(val) => { setRichContent?.(val); updateField?.('description', val); }}
              placeholder="What will learners accomplish in this course?"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Category</label>
              <Input value={formData?.category || ''} onChange={(e) => updateField?.('category', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Difficulty</label>
              <Select value={formData?.difficulty || 'beginner'} onChange={(e) => updateField?.('difficulty', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_META[d]?.label || d}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Status</label>
              <Select value={formData?.status || 'draft'} onChange={(e) => updateField?.('status', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Max Enrollments</label>
              <Input type="number" value={formData?.max_enrollments || ''} onChange={(e) => updateField?.('max_enrollments', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Start Date</label>
              <Input type="date" value={formData?.start_date || ''} onChange={(e) => updateField?.('start_date', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">End Date</label>
              <Input type="date" value={formData?.end_date || ''} onChange={(e) => updateField?.('end_date', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Grading Scale</label>
            <Select value={formData?.grading_scale || 'STANDARD'} onChange={(e) => updateField?.('grading_scale', e.target.value)} className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <option value="STANDARD">Standard</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="PASS_FAIL">Pass / Fail</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-700 px-6 py-4">
          <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700">Cancel</Button>
          <Button onClick={onSubmit} disabled={loading || !formData?.title?.trim()} className="shadow-sm">
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
