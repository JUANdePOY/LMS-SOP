export default function QuizCard({ quiz, onEdit, onDelete, onView, onTogglePublish, busy }) {
  const busyHere = busy === quiz.id;
  const status = quiz.status || 'draft';
  
  const statusLabel = {
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived'
  };
  
  const statusClasses = (st) => {
    if (st === 'published') return 'bg-emerald-100 text-emerald-700';
    if (st === 'archived') return 'bg-neutral-200 text-neutral-600';
    return 'bg-amber-100 text-amber-700';
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6M4 6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          </svg>
          {questionCountLabel}
        </span>
        {timeLimit && (
          <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
            </svg>
            {timeLimit} min
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <button onClick={() => onView?.(quiz)} disabled={busyHere} className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed" title="View">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8v8a1 1 0 01-1.447.724L15 14m-5 0L3.447 16.724A1 1 0 012 16V8a1 1 0 011.447-.724L10 10z" />
          </svg>
        </button>
        <button onClick={() => onEdit?.(quiz)} disabled={busyHere} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5m-5 0v5m5-5v-5m0 5h-5" />
          </svg>
        </button>
        <button onClick={() => onTogglePublish?.(quiz)} disabled={busyHere} className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed" title={status === "published" ? "Archive" : "Publish"}>
          {status === 'published' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h7.59L5 15.59V21M5 8v13m12-13v13" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6M12 3v12m9 9h-3V12l-3 9" />
            </svg>
          )}
        </button>
        <button onClick={() => onDelete?.(quiz)} disabled={busyHere} className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.143 21H7.857a2 2 0 01-1.999-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}