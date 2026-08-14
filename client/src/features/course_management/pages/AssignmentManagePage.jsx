import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";
import AssignmentTable from "../components/tables/AssignmentTable";
import CreateAssignmentModal from "../components/modals/CreateAssignmentModal";
import { FadeIn } from "@/shared/motion";

export default function AssignmentManagePage() {
  const { courseId } = useParams();
  const { data: assignments } = useAssignments(courseId);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Assignments</h1>
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm btn-primary">Create Assignment</button>
      </div>
      <FadeIn>
        <AssignmentTable assignments={assignments} onGrade={() => {}} />
      </FadeIn>
      <CreateAssignmentModal open={open} onClose={() => setOpen(false)} onSubmit={() => {}} courseId={courseId} />
    </div>
  );
}
