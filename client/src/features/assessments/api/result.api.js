import { request } from "./client";

const API_BASE = "/api/quiz";
const ATTEMPT_BASE = "/api/quiz-attempts";

export async function getQuizResults(quizId) {
  return request(`${API_BASE}/${quizId}/results`);
}

export async function getResultByAttempt(attemptId) {
  return request(`${ATTEMPT_BASE}/${attemptId}/results`);
}

export async function listResults(filters = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  return request(`${ATTEMPT_BASE}?${qs.toString()}`);
}
