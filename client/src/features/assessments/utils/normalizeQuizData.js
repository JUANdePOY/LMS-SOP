export function normalizeQuizData(quiz) {
  if (!quiz) return null;
  const questions = Array.isArray(quiz.questions)
    ? quiz.questions.map((q) => normalizeQuestion(q))
    : [];
  return {
    id: quiz.id,
    title: quiz.title || "",
    description: quiz.description || "",
    status: quiz.status || "draft",
    timeLimit: quiz.time_limit ?? quiz.timeLimit ?? 0,
    passingScore: quiz.passing_score ?? quiz.passingScore ?? 70,
    maxAttempts: quiz.max_attempts ?? quiz.maxAttempts ?? 1,
    randomizeQuestions: quiz.randomize_questions ?? quiz.randomizeQuestions ?? false,
    gradingMethod: quiz.grading_method ?? quiz.gradingMethod ?? "auto",
    questions,
  };
}

export function normalizeQuestion(question) {
  if (!question) return null;
  return {
    id: question.id,
    quizId: question.quiz_id ?? question.quizId,
    type: question.type || "multiple_choice",
    text: question.question_text ?? question.text ?? "",
    description: question.description || "",
    options: Array.isArray(question.options) ? question.options.map(normalizeOption) : [],
    correctAnswer: question.correct_answer ?? question.correctAnswer ?? null,
    weight: question.weight ?? 1,
    orderIndex: question.order_index ?? question.orderIndex ?? 0,
    isRequired: question.is_required ?? true,
  };
}

function normalizeOption(option) {
  if (typeof option === "string") return { id: undefined, text: option, value: option };
  return {
    id: option.id,
    text: option.text ?? option.label ?? "",
    value: option.value ?? option.text ?? "",
    isCorrect: option.is_correct ?? option.isCorrect ?? false,
  };
}

export default normalizeQuizData;
