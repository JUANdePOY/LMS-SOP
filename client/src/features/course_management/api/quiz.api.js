const API_BASE = "/api/quiz";

export async function getQuizzes(courseId, params = {}) {
  const qs = new URLSearchParams();
  qs.append("courseId", courseId);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch quizzes");
  return res.json();
}

export async function getQuizById(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch quiz");
  return res.json();
}

export async function createQuiz(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create quiz");
  return res.json();
}

export async function updateQuiz(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update quiz");
  return res.json();
}

export async function publishQuiz(id) {
  const res = await fetch(`${API_BASE}/${id}/publish`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to publish quiz");
  return res.json();
}

export async function archiveQuiz(id) {
  const res = await fetch(`${API_BASE}/${id}/archive`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to archive quiz");
  return res.json();
}

export async function deleteQuiz(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete quiz");
  return res.json();
}

export async function submitQuiz(quizId, payload) {
  const res = await fetch(`${API_BASE}/${quizId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit quiz");
  return res.json();
}

export async function getQuizResults(quizId) {
  const res = await fetch(`${API_BASE}/${quizId}/results`);
  if (!res.ok) throw new Error("Failed to fetch quiz results");
  return res.json();
}
