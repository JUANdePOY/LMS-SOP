import * as session from '@/services/session';

const API_BASE = "/api/courses";

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function getModules(courseId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch modules");
  return res.json();
}

export async function createModule(courseId, payload) {
  const res = await fetch(`${API_BASE}/${courseId}/modules`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create module");
  return res.json();
}

export async function updateModule(courseId, moduleId, payload) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update module");
  return res.json();
}

export async function deleteModule(courseId, moduleId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete module");
  return res.json();
}

export async function reorderModules(courseId, moduleIds) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/reorder`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ moduleIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder modules");
  return res.json();
}
