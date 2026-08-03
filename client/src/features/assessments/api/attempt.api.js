import { request } from "./client";

const API_BASE = "/api/quiz-attempts";

function toQuery(filters = {}) {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  return qs.toString();
}

export async function startAttempt(quizId) {
  return request(API_BASE, { method: "POST", body: JSON.stringify({ quizId }) });
}

export async function getAttempt(id) {
  return request(`${API_BASE}/${id}`);
}

export async function submitAttempt(id, payload) {
  return request(`${API_BASE}/${id}/submit`, { method: "POST", body: JSON.stringify(payload) });
}

export async function saveDraftAttempt(id, payload) {
  return request(`${API_BASE}/${id}/draft`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function cancelAttempt(id) {
  return request(`${API_BASE}/${id}/cancel`, { method: "PATCH" });
}

export async function listAttempts(filters = {}) {
  return request(`${API_BASE}?${toQuery(filters)}`);
}

export async function getAttemptResults(id) {
  return request(`${API_BASE}/${id}/results`);
}

export async function logViolation(payload) {
  return request(`${API_BASE}/violations`, { method: "POST", body: JSON.stringify(payload) });
}

export async function getViolations(filters = {}) {
  return request(`${API_BASE}/violations?${toQuery(filters)}`);
}

export async function getFlaggedAttempts(filters = {}) {
  return request(`${API_BASE}/violations/flagged?${toQuery(filters)}`);
}

export async function grantOverride(payload) {
  return request(`${API_BASE}/overrides`, { method: "POST", body: JSON.stringify(payload) });
}

export async function listOverrides(filters = {}) {
  return request(`${API_BASE}/overrides?${toQuery(filters)}`);
}

export async function revokeOverride(id) {
  return request(`${API_BASE}/overrides/${id}`, { method: "DELETE" });
}
