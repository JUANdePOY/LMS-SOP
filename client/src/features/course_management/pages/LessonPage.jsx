import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Download, ExternalLink, HelpCircle, ListChecks, Award, Clock, CheckCircle2, RefreshCw, PlayCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useMarkLessonComplete } from "../hooks/useMarkLessonComplete";
import LessonProgressBar from "../components/LessonProgressBar";
import LessonList from "../components/LessonList";
import VideoPlayer from "../components/utils/VideoPlayer";
import LB_PROSE from "../utils/lbProse";
import { getQuizzes, getQuizById } from "@/features/assessments/api/quiz.api";
import { listAttempts } from "@/features/assessments/api/attempt.api";
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
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [certificateLoading, setCertificateLoading] = useState(false);

  const modules = data?.modules || [];
  const currentLesson = data?.lessons?.find((l) => String(l.id) === String(lessonId));
  const lessons = data?.lessons || [];
  const nextLesson = lessons
    .filter((l) => l.order > (currentLesson?.order ?? 0))
    .sort((a, b) => a.order - b.order)[0] || null;

  const isFinalQuiz = moduleQuiz?.quiz_type === "final";
  const attemptsAllowed = isFinalQuiz ? (moduleQuiz?.attempts_allowed ?? 3) : Infinity;
  const attemptsUsed = quizAttempts.length;
  const attemptsRemaining = isFinalQuiz ? Math.max(0, attemptsAllowed - attemptsUsed) : Infinity;
  const latestAttempt = quizAttempts.length
    ? [...quizAttempts].sort((a, b) => (b.attempt_number || 0) - (a.attempt_number || 0))[0]
    : null;

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  useEffect(() => {
    if (currentLesson?.type === "quiz" && !moduleQuiz && !quizLoading) {
      setQuizLoading(true);
      const promise = currentLesson.quizId
        ? getQuizById(currentLesson.quizId)
        : getQuizzes(courseId, { module_id: currentLesson.module_id, limit: 1 });
      promise
        .then((res) => {
          if (currentLesson.quizId) {
            setModuleQuiz(res?.data || res || null);
          } else {
            const quizzes = res?.data || res || [];
            setModuleQuiz(Array.isArray(quizzes) ? quizzes[0] : quizzes);
          }
        })
        .catch(() => setModuleQuiz(null))
        .finally(() => setQuizLoading(false));
    }
  }, [currentLesson?.type, currentLesson?.module_id, currentLesson?.quizId, courseId, moduleQuiz, quizLoading]);

  useEffect(() => {
    if (currentLesson?.type !== "quiz") return;
    const quizId = currentLesson.quizId || moduleQuiz?.id;
    if (!quizId) return;
    listAttempts({ quizId })
      .then((res) => setQuizAttempts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setQuizAttempts([]));
  }, [currentLesson?.type, currentLesson?.quizId, moduleQuiz?.id]);

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
            </div>
          ) : currentLesson.type === 'reading' ? (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-3">{currentLesson.title}</h2>
              <div
                className={`prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 ${LB_PROSE}`}
                dangerouslySetInnerHTML={{ __html: currentLesson.description || currentLesson.content || "No content available." }}
              />
            </div>
          ) : currentLesson.type === 'quiz' ? (
            <div className="p-6">
              <div className="mb-5">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{currentLesson.title}</h2>
                {currentLesson.description && (
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{currentLesson.description}</p>
                )}
              </div>
              {quizLoading ? (
                <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-800/40 px-5 py-4">
                  <Loader2 size={18} className="animate-spin text-blue-600" />
                  <p className="text-sm text-neutral-500">Loading quiz…</p>
                </div>
              ) : moduleQuiz ? (
                <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-sm">
                  <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50/60 dark:from-blue-500/10 dark:via-neutral-900 dark:to-sky-500/5 px-6 pt-5 pb-5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_70%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_55%)]" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
                          <HelpCircle size={22} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-50">{moduleQuiz.title}</p>
                          {moduleQuiz.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{moduleQuiz.description}</p>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${moduleQuiz.quiz_type === 'final' ? 'border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300' : 'border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300'}`}>
                        {moduleQuiz.quiz_type === 'final' ? 'Final' : 'Practice'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 dark:border-neutral-800 px-6 py-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          <ListChecks size={13} /> Questions
                        </span>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{moduleQuiz.question_count ?? moduleQuiz.questionsCount ?? 0}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          <Award size={13} /> Points
                        </span>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{moduleQuiz.max_score ?? 0}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          <Clock size={13} /> Time
                        </span>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{moduleQuiz.time_limit ? `${moduleQuiz.time_limit} min` : '—'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          <CheckCircle2 size={13} /> Pass Mark
                        </span>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{moduleQuiz.passing_score != null ? `${moduleQuiz.passing_score}%` : '—'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          <RefreshCw size={13} /> Attempts
                        </span>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                          {isFinalQuiz ? `${attemptsRemaining}/${attemptsAllowed}` : '∞'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          <CheckCircle2 size={13} /> Latest Grade
                        </span>
                        {latestAttempt ? (
                          <span
                            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              latestAttempt.passed
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                            }`}
                          >
                            {latestAttempt.percentage != null ? `${latestAttempt.percentage}%` : `${latestAttempt.score}/${latestAttempt.max_score}`}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 px-6 py-4">
                    {(() => {
                      const canRetake = isFinalQuiz
                        ? attemptsRemaining > 0
                        : true;
                      const isRetake = currentLesson.status === 'completed' && canRetake;
                      if (currentLesson.status !== 'completed' || isRetake) {
                        return (
                          <button
                            onClick={() => {
                              try {
                                sessionStorage.setItem('quizReturnContext', JSON.stringify({ courseId, lessonId, nextLessonId: nextLesson?.id }));
                              } catch { /* ignore */ }
                              navigate(`/assessments/quiz/${moduleQuiz.id}/take`, { state: { courseId, lessonId, nextLessonId: nextLesson?.id } });
                            }}
                            className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-md active:bg-blue-800"
                          >
                            {isRetake ? (
                              <>
                                <RefreshCw size={17} className="transition-transform group-hover:rotate-90" />
                                Retake Quiz
                              </>
                            ) : (
                              <>
                                <PlayCircle size={17} className="transition-transform group-hover:scale-110" />
                                Start Quiz
                              </>
                            )}
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-5 py-4">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">No quiz is configured for this lesson.</p>
                </div>
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
          {currentLesson.status === 'completed' ? (
            <button
              onClick={() => nextLesson && navigate(`/courses/view/${courseId}/lesson/${nextLesson.id}`)}
              disabled={!nextLesson}
              className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-md active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nextLesson ? 'Proceed to Next Lesson' : 'Course Completed'}
              {nextLesson && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          ) : (
            isVideoOrText && (
              <button
                onClick={handleMarkComplete}
                disabled={marking}
                className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {marking ? 'Saving...' : 'Mark as Complete'}
              </button>
            )
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
