import { request } from "./client";

const API_BASE = "/api/quiz";

function buildQuery(courseId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  return `${API_BASE}?courseId=${encodeURIComponent(courseId)}&${qs.toString()}`;
}

export async function getQuizzes(courseId, params = {}) {
  return request(buildQuery(courseId, params));
}

export async function getMyQuizzes() {
  return request(`${API_BASE}/mine?t=${Date.now()}`);
}

export async function getAllQuizzes(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  return request(`${API_BASE}/all?${qs.toString()}`);
}

export async function getQuizById(id) {
  return request(`${API_BASE}/${id}`);
}

export async function getQuizResults(quizId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, v);
  });
  return request(`${API_BASE}/${quizId}/results?${qs.toString()}`);
}

export async function getLeaderboard(quizId, limit = 50) {
  return request(`${API_BASE}/${quizId}/leaderboard?limit=${limit}`);
}

export async function getCourseLeaderboard(courseId, limit = 50) {
  return request(`${API_BASE}/leaderboard/course/${courseId}?limit=${limit}`);
}

export async function getQuestions(quizId) {
  return request(`${API_BASE}/${quizId}/questions`);
}

export async function getQuestionById(quizId, questionId) {
  return request(`${API_BASE}/${quizId}/questions/${questionId}`);
}

export async function createQuiz(courseId, payload) {
  return request(API_BASE, { method: "POST", body: JSON.stringify({ courseId, ...payload }) });
}

export async function updateQuiz(id, payload) {
  return request(`${API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteQuiz(id) {
  return request(`${API_BASE}/${id}`, { method: "DELETE" });
}

export async function publishQuiz(id) {
  return request(`${API_BASE}/${id}/publish`, { method: "PATCH" });
}

export async function archiveQuiz(id) {
  return request(`${API_BASE}/${id}/archive`, { method: "PATCH" });
}

export async function duplicateQuiz(id) {
  return request(`${API_BASE}/${id}/duplicate`, { method: "POST" });
}

export async function createQuestion(quizId, payload) {
  return request(`${API_BASE}/${quizId}/questions`, { method: "POST", body: JSON.stringify(payload) });
}

export async function importQuestions(quizId, questions) {
  return request(`${API_BASE}/${quizId}/import`, { method: "POST", body: JSON.stringify({ questions }) });
}

export async function updateQuestion(quizId, questionId, payload) {
  return request(`${API_BASE}/${quizId}/questions/${questionId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteQuestion(quizId, questionId) {
  return request(`${API_BASE}/${quizId}/questions/${questionId}`, { method: "DELETE" });
}

export async function reorderQuestions(quizId, orderedIds) {
  return request(`${API_BASE}/${quizId}/reorder`, { method: "PATCH", body: JSON.stringify({ questions: orderedIds }) });
}

export async function getQuestionBanks(courseId) {
  return request(`${API_BASE}/banks?courseId=${encodeURIComponent(courseId)}`);
}

export async function createQuestionBank(courseId, payload) {
  return request(`${API_BASE}/banks`, { method: "POST", body: JSON.stringify({ courseId, ...payload }) });
}

export async function deleteQuestionBank(id) {
  return request(`${API_BASE}/banks/${id}`, { method: "DELETE" });
}

export async function getHierarchy(quizId) {
  return request(`${API_BASE}/${quizId}/hierarchy`);
}

export async function createHierarchy(quizId, payload) {
  return request(`${API_BASE}/${quizId}/hierarchy`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateHierarchy(quizId, hierarchyId, payload) {
  return request(`${API_BASE}/${quizId}/hierarchy/${hierarchyId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteHierarchy(quizId, hierarchyId) {
  return request(`${API_BASE}/${quizId}/hierarchy/${hierarchyId}`, { method: "DELETE" });
}
