import { FileQuestion } from "lucide-react";
import { ActionButton } from "@/shared/components/ui/actionIcons";

export default function QuizTable({ quizzes, onEdit, onDelete, onView, onTogglePublish, loading }) {
  const getStatus = (q) => q.status || 'draft';
  
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
            <FileQuestion className="h-6 w-6 text-neutral-400" />
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <ActionButton action="View" size="sm" onClick={() => onView?.(q)} />
                        <ActionButton action="Edit" size="sm" onClick={() => onEdit?.(q)} />
                        <ActionButton
                          action={rowStatus === 'published' ? 'Archive' : 'Publish'}
                          size="sm"
                          onClick={() => onTogglePublish?.(q)}
                        />
                        <ActionButton action="Delete" size="sm" onClick={() => onDelete?.(q)} />
                      </div>
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