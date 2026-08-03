export async function getQuizSummary(quizId) {
  const res = await fetch(`/api/quiz/${quizId}/summary`);
  if (!res.ok) throw new Error("Failed to fetch quiz summary");
  return res.json();
}

export async function getCourseQuizStats(courseId) {
  const res = await fetch(`/api/quiz/stats?courseId=${courseId}`);
  if (!res.ok) throw new Error("Failed to fetch quiz stats");
  return res.json();
}

export async function validateQuizBeforePublish(quizId) {
  const res = await fetch(`/api/quiz/${quizId}/validate`);
  if (!res.ok) throw new Error("Quiz validation failed");
  return res.json();
}
