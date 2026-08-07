import { ChevronRight, CheckCircle2, Flag, Circle } from "lucide-react";

const STATUS_ICON = {
  current: { Icon: ChevronRight, cls: "text-indigo-600 bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-900/20" },
  answered: { Icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  flagged: { Icon: Flag, cls: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  unanswered: { Icon: Circle, cls: "text-neutral-400 bg-neutral-100 dark:bg-neutral-800" },
};

function getStatus({ index, currentIndex, answers, flagged, questionId }) {
  if (index === currentIndex) return "current";
  const answered = answers && answers[questionId] !== undefined && answers[questionId] !== null && answers[questionId] !== "";
  if (answered && flagged && flagged.has(questionId)) return "flagged";
  if (flagged && flagged.has(questionId)) return "flagged";
  if (answered) return "answered";
  return "unanswered";
}

export default function ProgressStepper({ questions, currentIndex, answers, flagged, onSelect, onReview }) {
  return (
    <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Questions</p>
        <button
          type="button"
          onClick={onReview}
          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          Review
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, idx) => {
          const status = getStatus({ index: idx, currentIndex, answers, flagged, questionId: q.id });
          const { Icon, cls } = STATUS_ICON[status] || STATUS_ICON.unanswered;
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelect(idx)}
              aria-label={`Question ${idx + 1}${isCurrent ? " (current)" : ""}`}
              title={`Question ${idx + 1}`}
              className={`
                relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                transition-all duration-150
                hover:scale-110 active:scale-95
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
                ${isCurrent ? "z-10" : ""}
              `}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${cls}`}>
                {status === "answered" || status === "flagged" ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <span className="text-[11px] font-semibold">{idx + 1}</span>
                )}
              </span>
              {isCurrent && (
                <span className="absolute -bottom-1 h-0.5 w-4 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
