import { QUESTION_TYPE_CONFIG } from "../constants/questionTypes";

const DEFAULT_PASSING_SCORE = 70;

export function calculateScore(answers, questions) {
  const config = QUESTION_TYPE_CONFIG;
  let score = 0;
  let maxScore = 0;

  questions.forEach((question) => {
    const weight = question.weight || 1;
    maxScore += weight;
    const selected = answers[question.id];
    const correct = question.correct_answer;
    const isCorrect = config[question.type]?.isSingle
      ? selected === correct
      : Array.isArray(selected) && Array.isArray(correct) && selected.length === correct.length && selected.every((v) => correct.includes(v));
    if (isCorrect) score += weight;
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const isPassed = percentage >= (questions.passing_score ?? DEFAULT_PASSING_SCORE);

  return { score, maxScore, percentage, isPassed };
}

export function getPassingScore(questions, override) {
  return questions?.passing_score ?? override ?? DEFAULT_PASSING_SCORE;
}
