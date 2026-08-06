import * as session from '@/services/session';

const API_BASE = "/api/courses";

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function getCourseProgress(courseId, userId) {
  const res = await fetch(`${API_BASE}/${courseId}/progress`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

export async function getModuleProgress(courseId, moduleId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}/progress`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch module progress");
  return res.json();
}

export async function markContentComplete(courseId, moduleId, contentId) {
  const res = await fetch(`${API_BASE}/${courseId}/progress/complete`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ moduleId, contentId }),
  });
  if (!res.ok) throw new Error("Failed to mark content complete");
  return res.json();
}

export async function updateProgress(payload) {
  const res = await fetch(`${API_BASE}/progress`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update progress");
  return res.json();
}

export async function getClassProgress(courseId) {
  const res = await fetch(`${API_BASE}/${courseId}/progress/class`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch class progress");
  return res.json();
}
