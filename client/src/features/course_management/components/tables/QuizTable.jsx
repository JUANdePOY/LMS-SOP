export default function QuizTable({ quizzes, onEdit, onDelete, onView, onTogglePublish, loading }) {
  const getStatus = (q) => q.status || 'draft';
  
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

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-6">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : quizzes?.length === 0 ? (
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6M4 6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">No quizzes found</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Create a quiz to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-20">Questions</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-16">Time</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-24">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {quizzes?.map((q) => {
                const questionCount = q.question_count ?? q.questionCount ?? 0;
                const timeLimit = q.time_limit;
                const rowStatus = getStatus(q);
                return (
                  <tr key={q.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150">
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{q.title}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{questionCount}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{timeLimit ? `${timeLimit} min` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full ${statusClasses(rowStatus)}`}>
                        {statusLabel[rowStatus] || rowStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button onClick={() => onView?.(q)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" title="View">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8v8a1 1 0 01-1.447.724L15 14m-5 0L3.447 16.724A1 1 0 012 16V8a1 1 0 011.447-.724L10 10z" />
                        </svg>
                      </button>
                      <button onClick={() => onEdit?.(q)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5m-5 0v5m5-5v-5m0 5h-5" />
                        </svg>
                      </button>
                      <button onClick={() => onTogglePublish?.(q)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20" title={rowStatus === "published" ? "Archive" : "Publish"}>
                        {rowStatus === 'published' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h7.59L5 15.59V21M5 8v13m12-13v13" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6M12 3v12m9 9h-3V12l-3 9" />
                          </svg>
                        )}
                      </button>
                      <button onClick={() => onDelete?.(q)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.143 21H7.857a2 2 0 01-1.999-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}