export async function trackViewEvent(contentId) {
  await fetch(`/api/progress/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId, viewedAt: new Date().toISOString() }),
  });
}

export async function trackQuizAttempt(quizId, score) {
  await fetch(`/api/progress/quiz-attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quizId, score, attemptedAt: new Date().toISOString() }),
  });
}
