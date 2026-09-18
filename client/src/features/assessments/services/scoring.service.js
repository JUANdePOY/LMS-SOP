const DEFAULT_PASSING_SCORE = 70;

export function calculateScore(answers, questions) {
  let score = 0;
  let maxScore = 0;

  questions.forEach((question) => {
    const weight = question.weight || 1;
    maxScore += weight;
    const selected = answers[question.id];
    const correct = question.correct_answer;
    const { earned } = scoreAnswer(question.type, selected, correct, weight);
    score += earned;
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const isPassed = percentage >= (questions.passing_score ?? DEFAULT_PASSING_SCORE);

  return { score, maxScore, percentage, isPassed };
}

function scoreAnswer(type, selected, correct, weight) {
  const normalize = (v) => String(v ?? '').trim().toLowerCase();
  if (type === 'multiple_choice' || type === 'true_false') {
    const isCorrect = normalize(selected) === normalize(correct);
    return { earned: isCorrect ? weight : 0 };
  }
  if (type === 'multi_select' || type === 'multiple_select') {
    const sel = Array.isArray(selected) ? selected.map(normalize) : selected ? [normalize(selected)] : [];
    const cor = Array.isArray(correct) ? correct.map(normalize) : correct ? [normalize(correct)] : [];
    const totalCorrect = cor.length;
    if (totalCorrect === 0) return { earned: 0 };
    const correctSelected = sel.filter((v) => cor.includes(v)).length;
    const wrongSelected = sel.filter((v) => !cor.includes(v)).length;
    const partialCredit = Math.max(0, (correctSelected - wrongSelected) / totalCorrect);
    return { earned: weight * partialCredit };
  }
  if (type === 'short_answer') {
    const isCorrect = normalize(selected) === normalize(correct);
    return { earned: isCorrect ? weight : 0 };
  }
  return { earned: 0 };
}

export function getPassingScore(questions, override) {
  return questions?.passing_score ?? override ?? DEFAULT_PASSING_SCORE;
}
