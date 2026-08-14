import { useState } from "react";
import { useParams } from "react-router-dom";
import { useGrades } from "../hooks/useGrades";
import GradeTable from "../components/tables/GradeTable";
import GradeSubmissionModal from "../components/modals/GradeSubmissionModal";
import { FadeIn } from "@/shared/motion";

export default function GradebookPage() {
  const { courseId } = useParams();
  const { data: grades } = useGrades({ courseId });
  const [gradeTarget, setGradeTarget] = useState(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Gradebook</h1>
      <FadeIn>
        <GradeTable grades={grades} onGrade={setGradeTarget} />
      </FadeIn>
      <GradeSubmissionModal open={!!gradeTarget} onClose={() => setGradeTarget(null)} onSubmit={() => {}} />
    </div>
  );
}
