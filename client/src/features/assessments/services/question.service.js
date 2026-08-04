export async function getQuestionBank(courseId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`/api/question-bank?courseId=${courseId}&${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch question bank");
  return res.json();
}

export async function importQuestions(quizId, questions) {
  const res = await fetch(`/api/quiz/${quizId}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions }),
  });
  if (!res.ok) throw new Error("Failed to import questions");
  return res.json();
}
