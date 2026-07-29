import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuizzes } from "../hooks/useQuizzes";
import QuizTable from "../components/tables/QuizTable";
import CreateQuizModal from "../components/modals/CreateQuizModal";

export default function QuizManagePage() {
  const { courseId } = useParams();
  const { data: quizzes } = useQuizzes(courseId);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Quizzes</h1>
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm bg-blue-600 text-white">Create Quiz</button>
      </div>
      <QuizTable quizzes={quizzes} onView={() => {}} />
      <CreateQuizModal open={open} onClose={() => setOpen(false)} onSubmit={() => {}} courseId={courseId} />
    </div>
  );
}
