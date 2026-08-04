import { request } from "./client";

const API_BASE = "/api/quiz";

export async function getQuestions(quizId) {
  return request(`${API_BASE}/${quizId}/questions`);
}

export async function getQuestionById(quizId, questionId) {
  return request(`${API_BASE}/${quizId}/questions/${questionId}`);
}

export async function createQuestion(quizId, payload) {
  return request(`${API_BASE}/${quizId}/questions`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateQuestion(quizId, questionId, payload) {
  return request(`${API_BASE}/${quizId}/questions/${questionId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteQuestion(quizId, questionId) {
  return request(`${API_BASE}/${quizId}/questions/${questionId}`, { method: "DELETE" });
}
