export default function QuizCard({ quiz, onAction }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-900 p-3 shadow-sm">
      <h4 className="text-sm font-medium">{quiz.title}</h4>
      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{quiz.description}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
        <span>{quiz.questionCount ?? 0} questions</span>
        <span>{quiz.timeLimit ?? 0} min</span>
        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{quiz.status}</span>
      </div>
    </div>
  );
}
