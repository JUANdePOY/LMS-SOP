import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { shuffle } from "../utils/randomizeQuestions";
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from "lucide-react";

function normalizeOptions(question) {
  const opts = question?.options || [];
  return opts.map((o) => {
    if (typeof o === "string") return { label: o, value: o };
    return {
      label: o.label || o.text || "",
      value: o.value !== undefined ? o.value : (o.label || o.text || ""),
    };
  });
}

function QuestionOption({ option, type, selected, onChange }) {
  const isChecked =
    type === "multi_select"
      ? Array.isArray(selected) && selected.includes(option.value)
      : selected === option.value;

  const base = "flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border transition-all";
  const selectedCls = "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200";

  if (type === "multiple_choice" || type === "true_false") {
    return (
      <label className={`${base} ${isChecked ? selectedCls : "border-neutral-200 hover:bg-neutral-50"}`}>
        <input
          type="radio"
          name="answer"
          checked={isChecked}
          onChange={() => onChange(option.value)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-neutral-800">{option.label}</span>
      </label>
    );
  }

  if (type === "multi_select") {
    return (
      <label className={`${base} ${isChecked ? selectedCls : "border-neutral-200 hover:bg-neutral-50"}`}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onChange(option.value)}
          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-neutral-800">{option.label}</span>
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
}) {
  const { user } = useAuth();
  const [now, setNow] = useState(() => Date.now());

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

  const handleSelect = (value) => {
    if (!question) return;
    if (question.type === "multi_select") {
      const arr = Array.isArray(selected) ? selected : [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      setAnswer(question.id, next);
    } else {
      setAnswer(question.id, value);
    }
  };

  const isLast = currentIndex >= questions.length - 1;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-4xl mx-auto select-none"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Traceable watermark — student name + live timestamp */}
      <div className="fixed top-4 right-4 z-20 text-xs text-neutral-400 pointer-events-none select-text">
        <span className="font-medium opacity-80">
          Trace: {user?.full_name || user?.email || "User"}
        </span>{" "}
        · <span>{new Date(now).toLocaleTimeString()}</span>
      </div>

      {violationCount > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 text-amber-800 px-3 py-2 text-xs">
          <AlertTriangle className="h-4 w-4" />
          Integrity warning #{violationCount}. Further violations may auto-submit this attempt.
        </div>
      )}

      {/* Header: timer + progress */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 mb-4">
        {timeLimit ? (
          <div className="flex items-center gap-2 font-mono text-sm">
            <Clock className="h-4 w-4" />
            <span className={remaining <= 60 ? "text-red-600" : "text-neutral-700"}>
              {Math.max(0, remaining)}s
            </span>
          </div>
        ) : (
          <div />
        )}
        <div className="text-xs text-neutral-500">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div className="w-32 h-2.5 bg-neutral-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {remaining !== null && remaining <= 30 && (
          <span className="ml-2 text-xs font-medium text-rose-600 animate-pulse">Time running out</span>
        )}
      </div>

      {/* Question */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="mb-1 text-xs font-medium text-neutral-500">
          Question {currentIndex + 1} · {question?.points || 1} pt
        </div>
        <h2 className="text-lg font-medium text-neutral-800 mb-4">{question?.question_text || question?.text}</h2>

        {question?.type === "short_answer" ? (
          <textarea
            className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Type your answer..."
            value={typeof selected === "string" ? selected : ""}
            onChange={(e) => setAnswer(question.id, e.target.value)}
          />
        ) : (
          <div className="space-y-1">
            {options.map((opt) => (
              <QuestionOption
                key={opt.value}
                option={opt}
                type={question?.type}
                selected={selected}
                onChange={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => (currentIndex > 0 ? goTo(currentIndex - 1) : cancel())}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          <ChevronLeft className="h-4 w-4" />
          {currentIndex > 0 ? "Back" : "Cancel"}
        </button>

        {!isLast ? (
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={status === "submitting"}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting..." : "Submit Quiz"}
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
