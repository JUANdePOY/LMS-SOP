import { useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTakeQuiz } from "../hooks/useTakeQuiz";
import { useIntegrityMonitor } from "../hooks/useIntegrityMonitor";
import QuizPlayer from "../components/QuizPlayer";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { formatDuration } from "../utils/formatDuration";
import { Trophy, CheckCircle, XCircle } from "lucide-react";

function ResultView({ result, quiz }) {
  const passed = result?.passed;
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
          {result.timeTakenSec != null && (
            <div className="text-sm text-neutral-500">Time taken: {formatDuration(result.timeTakenSec)}</div>
          )}
          {!passed && quiz?.quiz_type === "final" && (
            <div className="text-sm text-neutral-500">
              You can retake this quiz from the Assessments page if attempts remain.
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button asChild>
              <Link to={`/assessments/quiz/${quiz.id}/results`}>Review Results</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/assessments">Back to Assessments</Link>
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
  const { quiz, status, result, attempt, violationCount, limitReached, start, reportViolation } = engine;

  const handleViolation = useCallback(
    (type, metadata) => reportViolation(type, metadata),
    [reportViolation]
  );

  useIntegrityMonitor({ active: status === "playing", containerRef, onEvent: handleViolation });

  useEffect(() => {
    if (quizId && status === "idle") start(quizId);
  }, [quizId, status, start]);

  useEffect(() => {
    if (status === "playing" && containerRef.current && document.fullscreenElement === null) {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, [status]);

  if (status === "loading" || status === "idle") {
    return <div className="p-8 text-center text-neutral-600">Preparing your quiz…</div>;
  }

  if (status === "limit_reached") {
    return <LimitReachedView limitReached={limitReached} quiz={quiz} />;
  }

  if (status === "error" || !quiz) {
    return (
      <div className="p-8 text-center text-neutral-600">
        Unable to load the quiz. <Link to="/assessments" className="text-indigo-600 underline">Back to assessments</Link>
      </div>
    );
  }

  if (status === "submitted") {
    return <ResultView result={result} quiz={quiz} attempt={attempt} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-6">
      <QuizPlayer key={quiz.id} {...engine} containerRef={containerRef} violationCount={violationCount} />
    </div>
  );
}
