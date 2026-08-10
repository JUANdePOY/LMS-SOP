import { useRef, useCallback, useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useTakeQuiz } from "../hooks/useTakeQuiz";
import { useQuiz } from "../hooks/useQuiz";
import { useIntegrityMonitor } from "../hooks/useIntegrityMonitor";
import { listAttempts } from "../api/attempt.api";
import QuizPlayer from "../components/QuizPlayer";
import QuizIntro from "../components/QuizIntro";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { formatDuration } from "../utils/formatDuration";
import { markLessonComplete } from "../../course_management/services/lesson-progress.service";
import { Trophy, CheckCircle, XCircle, ArrowRight, ArrowLeft } from "lucide-react";

function ResultView({ result, quiz, attempt, attemptsRemaining, attemptsAllowed, onRetake }) {
  const passed = result?.passed;
  const location = useLocation();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const attemptNumber = attempt?.attempt_number ?? attempt?.attemptNumber ?? null;
  const canRetake = !passed && quiz?.quiz_type === "final" && attemptsRemaining > 0;
  const from = { ...(location.state || {}) };
  if (!from.courseId && !from.lessonId) {
    try {
      const stored = JSON.parse(sessionStorage.getItem("quizReturnContext") || "{}");
      from.courseId = from.courseId || stored.courseId;
      from.lessonId = from.lessonId || stored.lessonId;
      from.nextLessonId = from.nextLessonId || stored.nextLessonId;
    } catch { /* ignore */ }
  }
  const backToLesson = from.courseId && from.lessonId;
  const nextLessonId = from.nextLessonId;

  // Marking the quiz lesson complete on the backend unlocks the next lesson.
  const markCurrentLessonComplete = useCallback(async () => {
    if (!from.lessonId) return;
    try {
      setCompleting(true);
      await markLessonComplete(from.lessonId);
    } catch {
      // Non-fatal: backend enforces completion gating; proceed regardless.
    } finally {
      setCompleting(false);
    }
  }, [from.lessonId]);

  const goToLesson = async (targetLessonId) => {
    try { sessionStorage.removeItem("quizReturnContext"); } catch { /* ignore */ }
    if (passed && from.lessonId) await markCurrentLessonComplete();
    navigate(`/courses/view/${from.courseId}/lesson/${targetLessonId}`);
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {passed ? (
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            ) : (
              <XCircle className="h-6 w-6 text-rose-600" />
            )}
            <span className={passed ? "text-emerald-700" : "text-rose-700"}>
              {passed ? "Attempt Passed" : "Attempt Submitted"}
            </span>
          </CardTitle>
          <CardDescription>Your answers have been recorded for review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold">
            {result.score} / {result.maxScore} <span className="text-base text-neutral-500">({result.percentage}%)</span>
          </div>
          {quiz?.passing_score != null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-600">Passing score: {quiz.passing_score}%</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"
                }`}
              >
                {passed ? "Passed" : "Needs retake"}
              </span>
            </div>
          )}
          {attemptNumber != null && (
            <div className="text-sm text-neutral-500">
              Attempt {attemptNumber}
              {attemptsAllowed !== Infinity ? ` of ${attemptsAllowed}` : ""}
              {attemptsRemaining !== Infinity ? ` · ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left` : ""}
            </div>
          )}
          {result.timeTakenSec != null && (
            <div className="text-sm text-neutral-500">Time taken: {formatDuration(result.timeTakenSec)}</div>
          )}
          {!passed && quiz?.quiz_type === "final" && (
            <div className="text-sm text-neutral-500">
              You can retake this quiz from the Assessments page if attempts remain.
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            {passed && nextLessonId ? (
              <Button onClick={() => goToLesson(nextLessonId)} disabled={completing}>
                {completing ? "Completing…" : "Proceed to Next Lesson"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : passed && backToLesson ? (
              <Button onClick={() => goToLesson(from.lessonId)} disabled={completing}>
                {completing ? "Completing…" : "Back to Lesson"}
                <ArrowLeft className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <div className="flex flex-wrap gap-3">
                {canRetake && (
                  <Button variant="outline" onClick={onRetake}>
                    Retake Quiz
                  </Button>
                )}
              </div>
            )}
            <Button variant="outline" onClick={() => navigate(from.courseId ? `/courses/view/${from.courseId}` : "/courses")}>
              Back to Course
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LimitReachedView({ limitReached, quiz }) {
  const best = limitReached?.bestResult;
  return (
    <div className="max-w-2xl mx-auto mt-12 text-center">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-rose-700">
            <Trophy className="h-6 w-6" />
            Attempt Limit Reached
          </CardTitle>
          <CardDescription>
            You have used all {limitReached?.attemptsAllowed} attempts for this Final quiz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {best && (
            <div className="text-lg">
              Your best score: <strong>{best.score} / {best.max_score}</strong> ({best.percentage}%)
            </div>
          )}
          <div className="mt-4 text-sm text-neutral-500">
            Contact your instructor to request an additional attempt.
          </div>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link to={`/assessments/quiz/${quiz?.id}/results`}>View Attempt History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TakeQuizPage() {
  const { quizId } = useParams();
  const containerRef = useRef(null);
  const engine = useTakeQuiz();
  const { quiz, status, result, attempt, violationCount, limitReached, start, reset, reportViolation } = engine;
  const { quiz: quizDetails, loading: loadingDetails, error: detailsError } = useQuiz(quizId);

  const handleViolation = useCallback(
    (type, metadata) => reportViolation(type, metadata),
    [reportViolation]
  );

  useIntegrityMonitor({ active: status === "playing", containerRef, onEvent: handleViolation });

  const handleStart = useCallback(() => {
    if (quizId && status === "idle") start(quizId);
  }, [quizId, status, start]);

  const handleCancel = useCallback(() => {
    if (quizId) window.history.back();
  }, [quizId]);

  const handleRetake = useCallback(() => {
    reset();
    if (quizId) start(quizId);
  }, [quizId, reset, start]);

  const location = useLocation();
  const navigate = useNavigate();
  const from = { ...(location.state || {}) };
  if (!from.courseId && !from.lessonId) {
    try {
      const stored = JSON.parse(sessionStorage.getItem("quizReturnContext") || "{}");
      from.courseId = from.courseId || stored.courseId;
      from.lessonId = from.lessonId || stored.lessonId;
      from.nextLessonId = from.nextLessonId || stored.nextLessonId;
    } catch { /* ignore */ }
  }

  const handleBackToCourse = useCallback(() => {
    if (from.lessonId) {
      navigate(`/courses/view/${from.courseId}/lesson/${from.lessonId}`);
    } else {
      navigate(`/courses/view/${from.courseId}`);
    }
  }, [from.courseId, from.lessonId, navigate]);

  const handleProceedToNextLesson = useCallback(async () => {
    if (!from.lessonId) return;
    try {
      await markLessonComplete(from.lessonId);
    } catch {
      // non-fatal
    }
    if (from.nextLessonId) {
      navigate(`/courses/view/${from.courseId}/lesson/${from.nextLessonId}`);
    } else {
      navigate(`/courses/view/${from.courseId}`);
    }
  }, [from.courseId, from.lessonId, from.nextLessonId, navigate]);

  const isFinalDetails = quizDetails?.quiz_type === "final";
  const [completedAttempts, setCompletedAttempts] = useState(0);

  useEffect(() => {
    let active = true;
    if (isFinalDetails && quizId) {
      listAttempts({ quizId })
        .then((res) => {
          const rows = res?.data || [];
          if (!Array.isArray(rows) || !active) return;
          const used = rows.filter((a) => ["completed", "graded"].includes(a.status)).length;
          setCompletedAttempts(used);
        })
        .catch(() => {});
    } else {
      setCompletedAttempts(0);
    }
    return () => { active = false; };
  }, [isFinalDetails, quizId]);

  useEffect(() => {
    if (status === "submitted" && isFinalDetails && quizId) {
      listAttempts({ quizId })
        .then((res) => {
          const rows = res?.data || [];
          if (!Array.isArray(rows)) return;
          const used = rows.filter((a) => ["completed", "graded"].includes(a.status)).length;
          setCompletedAttempts(used);
        })
        .catch(() => {});
    }
  }, [status, isFinalDetails, quizId]);

  if (status === "limit_reached") {
    return <LimitReachedView limitReached={limitReached} quiz={quizDetails} />;
  }

  if (status === "error" || detailsError) {
    return (
      <div className="p-8 text-center text-neutral-600">
        Unable to load the quiz. <Link to="/assessments" className="text-indigo-600 underline">Back to assessments</Link>
      </div>
    );
  }

  if (status === "loading" || loadingDetails) {
    return <div className="p-8 text-center text-neutral-600">Preparing your quiz…</div>;
  }

  const attemptsAllowed = isFinalDetails ? (quizDetails?.attempts_allowed ?? 3) : Infinity;
  const attemptsRemaining = isFinalDetails
    ? Math.max(0, attemptsAllowed - completedAttempts)
    : Infinity;

  if (status === "submitted") {
    return (
      <ResultView
        result={result}
        quiz={quiz}
        attempt={attempt}
        attemptsRemaining={attemptsRemaining}
        attemptsAllowed={attemptsAllowed}
        onRetake={handleRetake}
      />
    );
  }

  if (status === "idle") {
    const attemptsAllowed = isFinalDetails ? (quizDetails?.attempts_allowed ?? 3) : Infinity;
    const attemptsRemaining = isFinalDetails
      ? Math.max(0, attemptsAllowed - completedAttempts)
      : "∞";
    const exhausted = isFinalDetails && attemptsRemaining <= 0;

    return (
      <div className="min-h-screen bg-neutral-50 py-6">
        <QuizIntro
          quiz={quizDetails}
          attemptsRemaining={attemptsRemaining}
          startDisabled={exhausted}
          onStart={handleStart}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-6">
      <QuizPlayer
        key={quiz.id}
        {...engine}
        containerRef={containerRef}
        violationCount={violationCount}
        result={result}
        onRetake={handleRetake}
        onBackToCourse={handleBackToCourse}
        onProceedToNextLesson={result?.passed ? handleProceedToNextLesson : undefined}
      />
    </div>
  );
}
