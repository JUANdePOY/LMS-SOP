const API_BASE = "/api/enrollments";

export async function getEnrollments(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch enrollments");
  return res.json();
}

export async function enrollStudent(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to enroll student");
  return res.json();
}

export async function bulkEnrollStudents(payload) {
  const res = await fetch(`${API_BASE}/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to bulk enroll students");
  return res.json();
}

export async function unenrollStudent(enrollmentId) {
  const res = await fetch(`${API_BASE}/${enrollmentId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to unenroll student");
  return res.json();
}

export async function getEnrollmentDetails(enrollmentId) {
  const res = await fetch(`${API_BASE}/${enrollmentId}`);
  if (!res.ok) throw new Error("Failed to fetch enrollment details");
  return res.json();
}

export async function updateEnrollmentStatus(enrollmentId, status) {
  const res = await fetch(`${API_BASE}/${enrollmentId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update enrollment status");
  return res.json();
}
