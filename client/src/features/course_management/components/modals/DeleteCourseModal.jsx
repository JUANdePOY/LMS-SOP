import { useEffect } from "react";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { Loader2 } from "lucide-react";

export default function DeleteCourseModal({ open, onClose, course, onConfirm, loading }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!open || !course) return null;

  return (
    <ConfirmDialog
      open={open}
      title="Delete Course"
      message={`Are you sure you want to delete "${course.title || 'this course'}"? This will move the course and its modules to the trash.`}
      confirmLabel="Delete"
      variant="danger"
      onConfirm={onConfirm}
      onCancel={onClose}
      loading={loading}
    />
  );
}
