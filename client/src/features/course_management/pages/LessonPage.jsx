import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Download, ExternalLink } from "lucide-react";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useMarkLessonComplete } from "../hooks/useMarkLessonComplete";
import LessonProgressBar from "../components/LessonProgressBar";
import LessonList from "../components/LessonList";
import VideoPlayer from "../components/utils/VideoPlayer";
import { getQuizzes } from "@/features/assessments/api/quiz.api";
import { getIssuancesByUser } from "@/features/certificate-management/services/certificateService";

export default function LessonPage() {
  const { id: courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useLessonProgress(courseId);
  const { complete, loading: marking } = useMarkLessonComplete();
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");
  const [moduleQuiz, setModuleQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [certificateLoading, setCertificateLoading] = useState(false);

  const modules = data?.modules || [];
  const currentLesson = data?.lessons?.find((l) => String(l.id) === String(lessonId));
  const lessons = data?.lessons || [];

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  useEffect(() => {
    if (currentLesson?.type === "quiz" && currentLesson?.module_id && !moduleQuiz && !quizLoading) {
      setQuizLoading(true);
      getQuizzes(courseId, { module_id: currentLesson.module_id, limit: 1 })
        .then((res) => setModuleQuiz((res.data || [])[0] || null))
        .catch(() => setModuleQuiz(null))
        .finally(() => setQuizLoading(false));
    }
  }, [currentLesson?.type, currentLesson?.module_id, courseId, moduleQuiz, quizLoading]);

  useEffect(() => {
    if (currentLesson?.type === "certificate" && currentLesson?.certificateTemplateId) {
      setCertificateLoading(true);
      getIssuancesByUser(courseId, { template_id: currentLesson.certificateTemplateId })
        .then((res) => {
          const rows = res.data?.data?.rows || res.data?.data || [];
          setCertificate(rows[0] || null);
        })
        .catch(() => setCertificate(null))
        .finally(() => setCertificateLoading(false));
    }
  }, [currentLesson?.type, currentLesson?.certificateTemplateId, courseId]);

  const handleMarkComplete = async () => {
    setMessage(null);
    try {
      const result = await complete(lessonId);
      setMessage(result.message || "Lesson completed");
      setMessageType("success");
      refetch();
    } catch (err) {
      setMessage(err.message || "Failed to mark lesson as complete");
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

  if (!data) {
    return <p className="text-sm text-neutral-500">Loading lesson...</p>;
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

  const isVideoOrText = ['video', 'reading', 'document', 'presentation', 'link', 'downloadable', 'sop', 'certificate'].includes(currentLesson.type);

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
        <div className="min-h-[200px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          {currentLesson.type === 'video' ? (
            <div className="p-4">
              <VideoPlayer src={currentLesson.url} title={currentLesson.title} />
              {currentLesson.description && (
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{currentLesson.description}</p>
              )}
            </div>
          ) : currentLesson.type === 'reading' ? (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-3">{currentLesson.title}</h2>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300"
                dangerouslySetInnerHTML={{ __html: currentLesson.description || currentLesson.content || "No content available." }}
              />
            </div>
          ) : currentLesson.type === 'quiz' ? (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-3">{currentLesson.title}</h2>
              {quizLoading ? (
                <p className="text-sm text-neutral-500">Loading quiz…</p>
              ) : moduleQuiz ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {moduleQuiz.title} &middot; {moduleQuiz.max_score} pts {moduleQuiz.time_limit ? `&middot; ${moduleQuiz.time_limit} min` : ""}
                  </p>
                  <button
                    onClick={() => navigate(`/assessments/quiz/${moduleQuiz.id}/take`)}
                    className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white"
                  >
                    Start Quiz
                  </button>
                </div>
              ) : (
                <p className="text-sm text-amber-600">No quiz is configured for this lesson.</p>
              )}
            </div>
          ) : currentLesson.type === 'sop' ? (
            <div className="p-6">
              <div className="flex items-start gap-3">
                <FileText size={24} className="text-blue-600 mt-0.5" />
                <div>
                  <h2 className="text-xl font-bold mb-2">{currentLesson.title}</h2>
                  {currentLesson.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{currentLesson.description}</p>
                  )}
                  {currentLesson.url && (
                    <a
                      href={`/sops/${currentLesson.url}`}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      View SOP document
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : currentLesson.type === 'document' ? (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{currentLesson.title}</h2>
              {currentLesson.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{currentLesson.description}</p>
              )}
              {currentLesson.url ? (
                <a href={currentLesson.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  <ExternalLink size={14} />
                  Open document
                </a>
              ) : (
                <p className="text-sm text-neutral-500">No document attached.</p>
              )}
            </div>
          ) : currentLesson.type === 'certificate' ? (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{currentLesson.title}</h2>
              {currentLesson.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{currentLesson.description}</p>
              )}
              {certificateLoading ? (
                <p className="text-sm text-neutral-500">Loading certificate…</p>
              ) : certificate ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Certificate #{certificate.certificate_number} &middot; Issued {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString() : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    {certificate.pdf_storage_path && (
                      <a
                        href={certificate.pdf_storage_path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        <Download size={14} />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-600">Certificate will be issued upon course completion.</p>
              )}
            </div>
          ) : currentLesson.type === 'link' ? (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">{currentLesson.title}</h2>
              {currentLesson.url && (
                <a href={currentLesson.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                  {currentLesson.url}
                </a>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-neutral-500">Content placeholder</div>
          )}
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
          <LessonList lessons={lessons} modules={modules} courseId={courseId} />
        </div>
      </div>
    </div>
  );
}
