export default function QuizRenderer({ quiz, onSubmit, submittedResult }) {
  if (submittedResult) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Quiz Completed</p>
        <p className="text-sm text-neutral-600">Your score: {submittedResult.score} / {submittedResult.maxScore}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{quiz.title}</h3>
      {quiz.questions?.map((q, idx) => (
        <div key={q.id} className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-sm font-medium mb-2">{idx + 1}. {q.question}</p>
          <div className="space-y-1">
            {q.options?.map((opt, optIdx) => (
              <label key={optIdx} className="flex items-center gap-2 text-sm">
                <input type="radio" name={`q-${q.id}`} value={opt.id} />
                <span>{opt.text}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={onSubmit} className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white">Submit Quiz</button>
    </div>
  );
}
