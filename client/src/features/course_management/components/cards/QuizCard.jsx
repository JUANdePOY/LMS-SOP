import { Clock, FileQuestion } from "lucide-react";
import { ActionButton } from "@/shared/components/ui/actionIcons";

export default function QuizCard({ quiz, onEdit, onDelete, onView, onTogglePublish, busy }) {
  const busyHere = busy === quiz.id;
  const status = quiz.status || 'draft';
  
  const statusLabel = {
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived'
  };
  
  const statusClasses = (st) => {
    if (st === 'published') return 'bg-success-soft text-[var(--color-success)]';
    if (st === 'archived') return 'bg-neutral-200 text-neutral-600';
    return 'bg-warning-soft text-[var(--color-warning)]';
  };

  const questionCount = quiz.question_count ?? quiz.questionCount ?? 0;
  const timeLimit = quiz.time_limit ?? quiz.timeLimit;
  const questionCountLabel = questionCount > 1 ? `${questionCount} questions` : `${questionCount} question`;

  return (
    <div className="group relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1 leading-tight">{quiz.title}</h4>
        
        <span className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full ${statusClasses(status)}`}>
          {statusLabel[status] || status}
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-2">{quiz.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
          <FileQuestion className="h-3 w-3" />
          {questionCountLabel}
        </span>
        {timeLimit && (
          <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" />
            {timeLimit} min
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <ActionButton action="View" onClick={() => onView?.(quiz)} disabled={busyHere} />
        <ActionButton action="Edit" onClick={() => onEdit?.(quiz)} disabled={busyHere} />
        <ActionButton
          action={status === 'published' ? 'Archive' : 'Publish'}
          onClick={() => onTogglePublish?.(quiz)}
          disabled={busyHere}
        />
        <ActionButton action="Delete" onClick={() => onDelete?.(quiz)} disabled={busyHere} />
      </div>
    </div>
  );
}