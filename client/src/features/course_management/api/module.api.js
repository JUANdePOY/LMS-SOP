const API_BASE = "/api/courses";

export async function getModules(courseId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules`);
  if (!res.ok) throw new Error("Failed to fetch modules");
  return res.json();
}

export async function createModule(courseId, payload) {
  const res = await fetch(`${API_BASE}/${courseId}/modules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create module");
  return res.json();
}

export async function updateModule(courseId, moduleId, payload) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update module");
  return res.json();
}

export async function deleteModule(courseId, moduleId) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/${moduleId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete module");
  return res.json();
}

export async function reorderModules(courseId, moduleIds) {
  const res = await fetch(`${API_BASE}/${courseId}/modules/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder modules");
  return res.json();
}
