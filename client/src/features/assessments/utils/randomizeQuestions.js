import { QUESTION_TYPES } from "../constants/questionTypes";

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function randomizeQuestions(questions, options = {}) {
  const { shuffleQuestions = false, shuffleOptions = false } = options;
  let result = shuffleQuestions ? shuffle(questions) : [...questions];

  if (shuffleOptions) {
    result = result.map((q) => {
      if (q.type === QUESTION_TYPES.SHORT_ANSWER) return q;
      const optionsList = q.options || [];
      const shuffled = shuffle(optionsList);
      return { ...q, options: shuffled };
    });
  }

  return result;
}

export function reorderQuestions(questions, orderedIds) {
  const map = new Map(questions.map((q) => [q.id, q]));
  const ordered = orderedIds
    .map((id) => map.get(id))
    .filter(Boolean);
  const remaining = questions.filter((q) => !orderedIds.includes(q.id));
  return [...ordered, ...remaining];
}
