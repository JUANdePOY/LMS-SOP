import { useState } from "react";
import { useCourseList } from "../hooks/useCourseList";
import { useProgressTracking } from "../hooks/useProgressTracking";
import { useParams, useNavigate } from "react-router-dom";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useAuth } from "@/contexts/AuthContext";
import LessonProgressBar from "../components/LessonProgressBar";
import LessonList from "../components/LessonList";

export default function CourseLearnerView() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: courses } = useCourseList({ status: "published" });
  const course = courses?.find((c) => c.id === courseId);
  const { data: legacyProgress } = useProgressTracking(courseId, "me");
  const { data, loading, error, refetch } = useLessonProgress(courseId);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState(null);

  const isEnrolled = !!data;
  const summary = data?.summary || { total: 0, completed: 0, completionPct: legacyProgress?.progressPct || 0 };
  const lessons = data?.lessons || [];

  const handleEnroll = async () => {
    if (!user?.id) {
      setEnrollError("You must be logged in to enroll.");
      return;
    }
    setEnrolling(true);
    setEnrollError(null);
    try {
      const { enrollInCourse } = await import("../services/lesson-progress.service");
      await enrollInCourse(courseId);
      refetch();
    } catch (err) {
      setEnrollError(err.message);
    } finally {
      setEnrolling(false);
    }
  };

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
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">{course?.title ?? "Course"}</h1>
      <p className="text-sm text-neutral-600">{course?.description}</p>

      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold mb-2">Your Progress</h2>
      <LessonProgressBar completed={summary.completed} total={summary.total} modules={data?.moduleProgress} />
      {!isEnrolled && (
          <div className="mt-3">
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white disabled:opacity-50"
            >
              {enrolling ? 'Enrolling...' : 'Enroll to Start'}
            </button>
            {enrollError && <p className="text-xs text-red-600 mt-1">{enrollError}</p>}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold mb-2">Lessons</h2>
        <LessonList lessons={lessons} modules={data?.modules} onLessonClick={(lesson) => navigate(`/courses/view/${courseId}/lesson/${lesson.id}`)} courseId={courseId} />
      </div>
    </div>
  );
}
