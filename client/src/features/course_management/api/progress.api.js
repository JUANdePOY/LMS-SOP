const API_BASE = "/api/progress";

export async function getCourseProgress(courseId, userId) {
  const res = await fetch(`${API_BASE}?courseId=${courseId}&userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

export async function getModuleProgress(courseId, moduleId) {
  const res = await fetch(`${API_BASE}?courseId=${courseId}&moduleId=${moduleId}`);
  if (!res.ok) throw new Error("Failed to fetch module progress");
  return res.json();
}

export async function markContentComplete(courseId, moduleId, contentId) {
  const res = await fetch(`${API_BASE}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, moduleId, contentId }),
  });
  if (!res.ok) throw new Error("Failed to mark content complete");
  return res.json();
}

export async function updateProgress(payload) {
  const res = await fetch(`${API_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update progress");
  return res.json();
}

export async function getClassProgress(courseId) {
  const res = await fetch(`${API_BASE}/class?courseId=${courseId}`);
  if (!res.ok) throw new Error("Failed to fetch class progress");
  return res.json();
}
