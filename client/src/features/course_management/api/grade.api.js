const API_BASE = "/api/grades";

export async function getGrades(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch grades");
  return res.json();
}

export async function getGradebook(courseId, params = {}) {
  const qs = new URLSearchParams({ courseId });
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}/gradebook?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch gradebook");
  return res.json();
}

export async function createGrade(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create grade");
  return res.json();
}

export async function updateGrade(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update grade");
  return res.json();
}

export async function bulkImportGrades(payload) {
  const res = await fetch(`${API_BASE}/bulk-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to import grades");
  return res.json();
}

export async function getGradingRubric(gradingId) {
  const res = await fetch(`${API_BASE}/${gradingId}/rubric`);
  if (!res.ok) throw new Error("Failed to fetch grading rubric");
  return res.json();
}

export async function createGradingRubric(gradingId, payload) {
  const res = await fetch(`${API_BASE}/${gradingId}/rubric`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create rubric");
  return res.json();
}
