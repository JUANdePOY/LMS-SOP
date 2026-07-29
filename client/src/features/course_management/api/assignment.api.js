const API_BASE = "/api/assignments";

export async function getAssignments(courseId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}?courseId=${courseId}&${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch assignments");
  return res.json();
}

export async function getAssignmentById(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch assignment");
  return res.json();
}

export async function createAssignment(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create assignment");
  return res.json();
}

export async function updateAssignment(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update assignment");
  return res.json();
}

export async function deleteAssignment(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete assignment");
  return res.json();
}

export async function submitAssignment(assignmentId, payload) {
  const res = await fetch(`${API_BASE}/${assignmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit assignment");
  return res.json();
}

export async function gradeAssignment(assignmentId, submissionId, payload) {
  const res = await fetch(`${API_BASE}/${assignmentId}/submissions/${submissionId}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to grade assignment");
  return res.json();
}
