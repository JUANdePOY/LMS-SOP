import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEnrollmentList } from "../hooks/useEnrollmentList";
import EnrollmentTable from "../components/tables/EnrollmentTable";
import EnrollStudentsModal from "../components/modals/EnrollStudentsModal";
import { useAuth } from "@/contexts/AuthContext";

export default function EnrollmentManagePage() {
  const { courseId } = useParams();
  const { data: enrollments, refetch } = useEnrollmentList({ courseId });
  const [open, setOpen] = useState(false);
  const { isAnyAdmin } = useAuth();

  if (!isAnyAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Enrollments</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">Access Denied</p>
          <p className="text-red-600 mt-1">Only administrators can manage course enrollments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Enrollments</h1>
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Enroll Students</button>
      </div>
      <EnrollmentTable enrollments={enrollments} onUnenroll={() => refetch?.()} />
      <EnrollStudentsModal open={open} onClose={() => setOpen(false)} onSubmit={() => refetch?.()} />
    </div>
  );
}
