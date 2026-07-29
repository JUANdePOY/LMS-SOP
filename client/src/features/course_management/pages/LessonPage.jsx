import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useMarkLessonComplete } from "../hooks/useMarkLessonComplete";
import LessonProgressBar from "../components/LessonProgressBar";
import LessonList from "../components/LessonList";

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useLessonProgress(courseId);
  const { complete, loading: marking } = useMarkLessonComplete();
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");

  const currentLesson = data?.lessons?.find((l) => String(l.id) === String(lessonId));
  const lessons = data?.lessons || [];

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleMarkComplete = async () => {
    setMessage(null);
    try {
      const result = await complete(lessonId);
      setMessage(result.message || "Lesson completed");
      setMessageType("success");
      refetch();
    } catch (err) {
      setMessage(err.message);
      setMessageType("error");
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading lesson...</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Lesson</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">Failed to load</p>
          <p className="text-red-600 mt-1">{error}</p>
          <button onClick={refetch} className="mt-2 rounded-lg px-3 py-1.5 text-sm bg-red-600 text-white">Retry</button>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Lesson Not Found</h1>
        <button onClick={() => navigate(`/courses/view/${courseId}`)} className="rounded-lg px-3 py-2 text-sm border border-[var(--border)]">
          Back to Course
        </button>
      </div>
    );
  }

  if (currentLesson.status === 'locked') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{currentLesson.title}</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">This lesson is locked.</p>
          <p className="mt-1">Complete the previous lesson to unlock this one.</p>
        </div>
        <button onClick={() => navigate(`/courses/view/${courseId}`)} className="rounded-lg px-3 py-2 text-sm border border-[var(--border)]">
          Back to Course
        </button>
      </div>
    );
  }

  const isVideoOrText = ['video', 'reading', 'document', 'presentation', 'link', 'downloadable'].includes(currentLesson.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{currentLesson.title}</h1>
        <span className="text-xs text-neutral-400 uppercase tracking-wide">{currentLesson.type}</span>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold mb-2">Your Progress</h2>
        <LessonProgressBar completed={data.summary.completed} total={data.summary.total} />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold mb-2">Lesson Content</h2>
        {message && (
          <div className={`mb-3 rounded-lg p-3 text-sm ${messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message}
          </div>
        )}
        <div className="min-h-[200px] rounded-lg border border-dashed border-gray-200 dark:border-neutral-700 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">
            {currentLesson.type === 'video' ? 'Video player placeholder' :
             currentLesson.type === 'quiz' ? 'Quiz view placeholder' :
             'Reading content placeholder'}
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          {isVideoOrText && (
            <button
              onClick={handleMarkComplete}
              disabled={marking || currentLesson.status === 'completed'}
              className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {marking ? 'Saving...' : currentLesson.status === 'completed' ? 'Completed' : 'Mark as Complete'}
            </button>
          )}
          {currentLesson.type === 'quiz' && (
            <p className="text-xs text-neutral-500 italic">Complete this lesson via the quiz activity.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold mb-2">Up Next</h3>
          {lessons.filter((l) => l.order > currentLesson.order).slice(0, 3).map((next) => (
            <div key={next.id} className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 text-sm">
              <p className="font-medium">{next.title}</p>
              <p className="text-xs text-neutral-500 mt-1">{next.status === 'locked' ? 'Locked' : 'Ready'}</p>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Course Outline</h3>
          <LessonList lessons={lessons} courseId={courseId} />
        </div>
      </div>
    </div>
  );
}
