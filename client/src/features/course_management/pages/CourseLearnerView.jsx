import { useCourseList } from "../hooks/useCourseList";
import { useParams, useNavigate } from "react-router-dom";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useAuth } from "@/contexts/AuthContext";
import LessonProgressBar from "../components/LessonProgressBar";
import LessonList from "../components/LessonList";
import { FadeIn } from "@/shared/motion";

export default function CourseLearnerView() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: courses } = useCourseList({ status: "published" });
  const course = courses?.find((c) => c.id === courseId);
  const { data, loading, error, refetch } = useLessonProgress(courseId);

  const isEnrolled = !!data;
  const summary = data?.summary || { total: 0, completed: 0, completionPct: 0 };
  const lessons = data?.lessons || [];

  if (loading) return <p className="text-sm text-neutral-500">Loading course...</p>;
  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">{course?.title ?? "Course"}</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <FadeIn className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">{course?.title ?? "Course"}</h1>
      <p className="text-sm text-neutral-600">{course?.description}</p>

      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold mb-2">Your Progress</h2>
        <LessonProgressBar completed={summary.completed} total={summary.total} modules={data?.moduleProgress} />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold mb-2">Lessons</h2>
        <LessonList lessons={lessons} modules={data?.modules} onLessonClick={(lesson) => navigate(`/courses/view/${courseId}/lesson/${lesson.id}`)} courseId={courseId} />
      </div>
    </FadeIn>
  );
}
