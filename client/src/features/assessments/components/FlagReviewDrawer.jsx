import { ChevronRight, Circle, CheckCircle2, Flag } from "lucide-react";
import Drawer from "@/shared/components/ui/Drawer";

const STATUS_ICON = {
  current: { Icon: ChevronRight, cls: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
  answered: { Icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  flagged: { Icon: Flag, cls: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  unanswered: { Icon: Circle, cls: "text-neutral-400 bg-neutral-100 dark:bg-neutral-800" },
};

function getQuestionStatus({ index, currentIndex, answers, flagged, questionId }) {
  if (index === currentIndex) return "current";
  const answered = answers && answers[questionId] !== undefined && answers[questionId] !== null && answers[questionId] !== "";
  if (answered && flagged && flagged.has(questionId)) return "flagged";
  if (flagged && flagged.has(questionId)) return "flagged";
  if (answered) return "answered";
  return "unanswered";
}

export default function FlagReviewDrawer({ open, onClose, questions, currentIndex, answers, flagged, onSelect }) {
  const answeredCount = questions.filter((q) => {
    const a = answers && answers[q.id];
    return a !== undefined && a !== null && a !== "";
  }).length;
  const flaggedCount = flagged ? flagged.size : 0;
  const unansweredCount = questions.length - answeredCount;

  return (
    <Drawer open={open} onClose={onClose} title="Review Questions">
      <div className="mb-3 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {answeredCount} answered</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> {flaggedCount} flagged</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-neutral-300" /> {unansweredCount} unanswered</span>
      </div>
      <div className="space-y-1">
        {questions.map((q, idx) => {
          const status = getQuestionStatus({ index: idx, currentIndex, answers, flagged, questionId: q.id });
          const { Icon, cls } = STATUS_ICON[status] || STATUS_ICON.unanswered;
          return (
            <button
              key={q.id}
              onClick={() => { onSelect(idx); onClose(); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                idx === currentIndex
                  ? "bg-indigo-50 dark:bg-indigo-900/20"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${cls}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 min-w-0 truncate text-neutral-800 dark:text-neutral-200">
                {idx + 1}. {q.question_text || q.text || `Question ${idx + 1}`}
              </span>
            </button>
          );
        })}
      </div>
    </Drawer>
  );
}
