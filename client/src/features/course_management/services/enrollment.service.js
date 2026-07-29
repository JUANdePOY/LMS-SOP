export async function approveEnrollment(enrollmentId) {
  const res = await fetch(`/api/enrollments/${enrollmentId}/approve`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to approve enrollment");
  return res.json();
}

export async function rejectEnrollment(enrollmentId, reason) {
  const res = await fetch(`/api/enrollments/${enrollmentId}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to reject enrollment");
  return res.json();
}

export async function exportEnrollments(courseId) {
  const res = await fetch(`/api/enrollments/course/${courseId}/export`);
  if (!res.ok) throw new Error("Failed to export enrollments");
  return res.blob();
}
