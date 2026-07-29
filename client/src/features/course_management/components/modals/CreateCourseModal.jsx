import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Loader2 } from "lucide-react";

export default function CreateCourseModal({ open, onClose, loading }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setCategory("");
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleCreate = async () => {
    if (loading || !title.trim()) return;
    try {
      const payload = {
        title: title.trim(),
        description,
        category,
        status: "draft",
        modules: [],
      };
      const { builderCreate } = await import("@/features/course_management/api/course.api");
      const res = await builderCreate(payload);
      if (res?.success || res?.data?.success || res === 201) {
        const newId = res.data?.data?.id;
        if (newId) {
          navigate(`/courses/${newId}/builder`);
        } else {
          onClose?.();
        }
      } else {
        throw new Error(res.data?.message || "Failed to create course");
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to create course";
      alert(message);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} title="Add Course" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Course Title <span className="text-red-500">*</span></label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced Workplace Safety"
            className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will learners accomplish in this course?"
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Category</label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Safety, Compliance, Leadership"
            className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="border-neutral-200 dark:border-neutral-700">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !title.trim()} className="shadow-sm">
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            Create Course
          </Button>
        </div>
      </div>
    </Modal>
  );
}
