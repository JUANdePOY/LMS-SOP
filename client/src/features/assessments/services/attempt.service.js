export async function getAttemptHistory(userId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`/api/quiz-attempts/history?userId=${userId}&${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch attempt history");
  return res.json();
}

export async function canReattempt(userId, quizId) {
  const res = await fetch(`/api/quiz-attempts/can-reattempt?userId=${userId}&quizId=${quizId}`);
  if (!res.ok) throw new Error("Failed to check reattempt eligibility");
  return res.json();
}
