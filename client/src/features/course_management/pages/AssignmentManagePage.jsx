import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";
import AssignmentTable from "../components/tables/AssignmentTable";
import CreateAssignmentModal from "../components/modals/CreateAssignmentModal";

export default function AssignmentManagePage() {
  const { courseId } = useParams();
  const { data: assignments } = useAssignments(courseId);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Assignments</h1>
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Create Assignment</button>
      </div>
      <AssignmentTable assignments={assignments} onGrade={() => {}} />
      <CreateAssignmentModal open={open} onClose={() => setOpen(false)} onSubmit={() => {}} courseId={courseId} />
    </div>
  );
}
