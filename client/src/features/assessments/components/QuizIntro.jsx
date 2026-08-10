import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Clock, BookOpen, Trophy, Shield, AlertCircle } from "lucide-react";

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/60 dark:bg-neutral-800/40 p-3">
      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-base font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
      {sub && <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{sub}</p>}
    </div>
  );
}

export default function QuizIntro({ quiz, attemptsRemaining, onStart, onCancel, startDisabled = false }) {
  const timeLimit = quiz?.time_limit ? `${quiz.time_limit} min` : "None";
  const questionCount = quiz?.question_count ?? quiz?.questions?.length ?? 0;
  const passingScore = quiz?.passing_score != null ? `${quiz.passing_score}%` : "Not set";
  const isFinal = quiz?.quiz_type === "final";
  const attemptsValue =
    attemptsRemaining != null
      ? attemptsRemaining
      : isFinal
      ? quiz?.attempts_allowed ?? 3
      : "∞";
  const attemptsLabel = attemptsValue === "∞" ? "Unlimited" : attemptsValue;
  const exhausted = isFinal && attemptsRemaining !== "∞" && Number(attemptsRemaining) <= 0;
  const completionHint = isFinal
    ? quiz?.passing_score != null
      ? "This final quiz requires a passing score to be marked passed. Plan your attempt carefully."
      : "This final quiz requires submission, but no minimum passing score is configured."
    : "Practice quizzes can be retaken as many times as needed to build confidence.";

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{quiz?.title || "Quiz"}</CardTitle>
          <CardDescription className="mt-1">
            {quiz?.description || "Review the details below before starting."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Clock} label="Time" value={timeLimit} />
            <Stat icon={BookOpen} label="Questions" value={questionCount} />
            <Stat icon={Trophy} label="Passing" value={passingScore} sub={isFinal ? "Final quiz" : "Practice"} />
            <Stat icon={Shield} label="Attempts" value={attemptsLabel} />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-300">
            {completionHint}
          </div>

          {isFinal && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>This is a final quiz. Once submitted, your answers are locked for review. Make sure you have enough time before starting.</span>
            </div>
          )}

          {exhausted ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>You have reached the maximum number of attempts for this final quiz. It is no longer available.</span>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={onStart} disabled={startDisabled}>Start Quiz</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
