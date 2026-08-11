import { CheckCircle2, XCircle } from "lucide-react";
import { QUESTION_TYPE_LABELS } from "../constants/questionTypes";

function getOptionText(opt) {
  if (typeof opt === "string") return opt;
  if (opt && typeof opt === "object") return opt.label || opt.value || opt.text || JSON.stringify(opt);
  return String(opt);
}

function isOptionCorrect(option, correctAnswer) {
  const optText = (getOptionText(option) || "").toString().trim().toLowerCase();
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some(
      (ca) =>
        (typeof ca === "string" ? ca.trim().toLowerCase() : JSON.stringify(ca).toLowerCase()) === optText ||
        JSON.stringify(ca).toLowerCase() === JSON.stringify(option).toLowerCase()
    );
  }
  const caText = (correctAnswer != null ? correctAnswer : "").toString().trim().toLowerCase();
  return JSON.stringify(correctAnswer).toLowerCase() === JSON.stringify(option).toLowerCase() || caText === optText;
}

export function AnswerKeyList({ questions }) {
  if (!questions || questions.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">No questions added yet.</p>
    );
  }

  return (
    <ol className="space-y-3">
      {questions.map((q, idx) => {
        const type = q.type || "multiple_choice";
        const hasOptions = Array.isArray(q.options) && q.options.length > 0;
        const isShort = type === "short_answer" || !hasOptions;
        return (
          <li
            key={q.id || idx}
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {q.question_text || q.text || "Untitled question"}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-neutral-400">
                  {QUESTION_TYPE_LABELS[type] || type}
                  {q.points ? ` · ${q.points}pt` : ""}
                </p>

                {isShort ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="leading-snug">{q.correct_answer || "—"}</span>
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Expected
                    </span>
                  </div>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => {
                      const correct = isOptionCorrect(opt, q.correct_answer);
                      return (
                        <li
                          key={oi}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
                            correct
                              ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                              : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400"
                          }`}
                        >
                          {correct ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
                          )}
                          <span className="leading-snug">{getOptionText(opt)}</span>
                          {correct && (
                            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              Correct
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default AnswerKeyList;
