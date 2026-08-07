import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { shuffle } from "../utils/randomizeQuestions";
import { ChevronLeft, ChevronRight, Send, AlertTriangle, Flag, BookOpen } from "lucide-react";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { Button } from "@/shared/components/ui/button";
import ConfirmationDialog from "@/shared/components/ui/ConfirmationDialog";
import QuizTimer from "./QuizTimer";
import FlagReviewDrawer from "./FlagReviewDrawer";
import SubmitConfirmModal from "./SubmitConfirmModal";
import ProgressStepper from "./ProgressStepper";

const QUESTION_ANIMATION = `
@keyframes quizQuestionIn {
  from { opacity: 0; transform: translateX(12px); }
  to { opacity: 1; transform: translateX(0); }
}
.quiz-question-enter { animation: quizQuestionIn 0.22s ease-out both; }
@keyframes timerPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes savingPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.quiz-timer-critical { animation: timerPulse 1s ease-in-out infinite; }
.quiz-saving-pulse { animation: savingPulse 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .quiz-question-enter { animation: none; }
  .quiz-timer-critical { animation: none; }
  .quiz-saving-pulse { animation: none; }
}
`;

function normalizeOptions(question) {
  const opts = question?.options || [];
  if ((opts.length === 0 || !opts) && question?.type === "true_false") {
    return [
      { label: "True", value: "true" },
      { label: "False", value: "false" },
    ];
  }
  return opts.map((o) => {
    if (typeof o === "string") return { label: o, value: o };
    return {
      label: o.label || o.text || "",
      value: o.value !== undefined ? o.value : (o.label || o.text || ""),
    };
  });
}

function QuestionOption({ option, type, selected, onChange, disabled }) {
  const isChecked =
    type === "multiple_select"
      ? Array.isArray(selected) && selected.includes(option.value)
      : selected === option.value;

  const base = "flex items-center gap-3 cursor-pointer p-3 sm:p-3.5 rounded-lg border transition-all duration-150 min-h-[48px] hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1";
  const selectedCls = "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200 shadow-sm";

  if (type === "multiple_choice" || type === "true_false") {
    return (
      <label className={`${base} ${isChecked ? selectedCls : "border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"} ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
        <input
          type="radio"
          name="answer"
          checked={isChecked}
          onChange={() => onChange(option.value)}
          disabled={disabled}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-neutral-800 text-sm sm:text-base">{option.label}</span>
      </label>
    );
  }

  if (type === "multiple_select") {
    return (
      <label className={`${base} ${isChecked ? selectedCls : "border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"} ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onChange(option.value)}
          disabled={disabled}
          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-neutral-800 text-sm sm:text-base">{option.label}</span>
      </label>
    );
  }

  return null;
}

export default function QuizPlayer({
  quiz,
  answers,
  currentIndex,
  questions,
  timeElapsed,
  timeLimit,
  setAnswer,
  goTo,
  submit,
  cancel,
  violationCount,
  status,
  containerRef,
  saving = false,
}) {
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewDrawer, setShowReviewDrawer] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [flagged, setFlagged] = useState(() => new Set());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const question = questions[currentIndex];
  const options = useMemo(() => {
    if (!question) return [];
    const base = normalizeOptions(question);
    return quiz?.shuffle_options ? shuffle(base) : base;
  }, [question, quiz?.shuffle_options]);

  const selected = question ? answers[question.id] : undefined;
  const progress = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const remaining = timeLimit ? Number(timeLimit) - Number(timeElapsed) : null;
  const totalTimeLimit = timeLimit ? Number(timeLimit) : 0;

  const answeredCount = useMemo(() => {
    if (!answers || !questions) return 0;
    return questions.filter((q) => {
      const a = answers[q.id];
      return a !== undefined && a !== null && a !== "";
    }).length;
  }, [answers, questions]);

  const handleSelect = useCallback(
    (value) => {
      if (!question) return;
      if (question.type === "multiple_select") {
        const arr = Array.isArray(selected) ? selected : [];
        const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
        setAnswer(question.id, next);
      } else {
        setAnswer(question.id, value);
      }
    },
    [question, selected, setAnswer]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      goTo(currentIndex + 1);
    }
  }, [currentIndex, questions.length, goTo]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    } else {
      setShowCancelConfirm(true);
    }
  }, [currentIndex, goTo]);

  const handleSubmitClick = useCallback(() => {
    if (status !== "submitting") {
      setShowSubmitConfirm(true);
    }
  }, [status]);

  const handleConfirmSubmit = useCallback(() => {
    setShowSubmitConfirm(false);
    submit();
  }, [submit]);

  const handleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  }, [question]);

  const handleSelectOptionByIndex = useCallback(
    (index) => {
      if (options[index]) handleSelect(options[index].value);
    },
    [options, handleSelect]
  );

  const isLast = currentIndex >= questions.length - 1;
  const isFlagged = question ? flagged.has(question.id) : false;

  useKeyboardShortcuts({
    enabled: status === "playing",
    questionCount: options.length,
    isLast,
    isSubmitting: status === "submitting",
    questionType: question?.type,
    onNext: handleNext,
    onBack: handleBack,
    onSubmit: handleSubmitClick,
    onFlag: handleFlag,
    onSelectOption: handleSelectOptionByIndex,
  });

  return (
    <>
      <style>{QUESTION_ANIMATION}</style>
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl mx-auto select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="fixed top-4 right-4 z-20 text-xs text-neutral-400 pointer-events-none select-text">
          <span className="font-medium opacity-80">Trace: {user?.full_name || user?.email || "User"}</span>{" "}
          · <span>{new Date(now).toLocaleTimeString()}</span>
        </div>

        {violationCount > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 text-amber-800 px-3 py-2 text-xs">
            <AlertTriangle className="h-4 w-4" />
            Integrity warning #{violationCount}. Further violations may auto-submit this attempt.
          </div>
        )}

        <div className="lg:sticky lg:top-0 z-10 -mx-1 mb-4 rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <QuizTimer remaining={remaining} total={totalTimeLimit} />
            <div className="flex items-center gap-2">
              {saving && (
                <span className="quiz-saving-pulse inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <span className="h-2 w-2 animate-spin rounded-full border border-neutral-400 border-t-transparent" />
                  Saving…
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowReviewDrawer(true)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title="Review questions"
              >
                <BookOpen className="h-3 w-3" />
                Review
              </button>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Q {currentIndex + 1}/{questions.length}
              </span>
            </div>
          </div>
          <div className="mt-2 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-300 ease-out relative" style={{ width: `${progress}%` }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <ProgressStepper
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            flagged={flagged}
            onSelect={(idx) => goTo(idx)}
            onReview={() => setShowReviewDrawer(true)}
          />
        </div>

        <div
          key={question?.id || currentIndex}
          className={`quiz-question-enter rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 mb-4`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-neutral-500">
              Question {currentIndex + 1} · {question?.points || 1} pt
            </div>
            <button
              type="button"
              onClick={handleFlag}
              aria-label={isFlagged ? "Remove flag" : "Flag for review"}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isFlagged
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-neutral-200 text-neutral-500 hover:border-amber-300 hover:text-amber-700"
              }`}
            >
              <Flag className="h-3 w-3" />
              {isFlagged ? "Flagged" : "Flag"}
            </button>
          </div>
          <h2 className="text-base sm:text-lg font-medium text-neutral-800 mb-4">{question?.question_text || question?.text}</h2>

          {question?.type === "short_answer" ? (
            <textarea
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              rows={3}
              placeholder="Type your answer..."
              value={typeof selected === "string" ? selected : ""}
              onChange={(e) => setAnswer(question.id, e.target.value)}
            />
          ) : (
            <div className="space-y-2">
              {options.map((opt) => (
                <QuestionOption
                  key={opt.value}
                  option={opt}
                  type={question?.type}
                  selected={selected}
                  onChange={handleSelect}
                  disabled={status === "submitting"}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleBack}
            className="min-w-[80px] sm:min-w-[100px] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentIndex > 0 ? "Back" : "Cancel"}
          </Button>

          {!isLast ? (
            <Button
              onClick={handleNext}
              className="min-w-[80px] sm:min-w-[100px] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitClick}
              disabled={status === "submitting"}
              className="min-w-[100px] sm:min-w-[120px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {status === "submitting" ? "Submitting…" : "Submit Quiz"}
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={() => {
          setShowCancelConfirm(false);
          cancel();
        }}
        title="Leave quiz?"
        message="Your progress is saved. You can return to this quiz later from the Assessments page."
        confirmText="Leave quiz"
        cancelText="Stay"
        variant="destructive"
      />

      <FlagReviewDrawer
        open={showReviewDrawer}
        onClose={() => setShowReviewDrawer(false)}
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
        flagged={flagged}
        onSelect={(idx) => goTo(idx)}
      />

      <SubmitConfirmModal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
        onReview={() => { setShowSubmitConfirm(false); setShowReviewDrawer(true); }}
        questionCount={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flagged.size}
        timeElapsed={timeElapsed}
        isSubmitting={status === "submitting"}
      />
    </>
  );
}
