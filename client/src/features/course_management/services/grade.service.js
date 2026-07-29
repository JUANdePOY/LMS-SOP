export async function finalizeGrades(courseId) {
  const res = await fetch(`/api/grades/${courseId}/finalize`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to finalize grades");
  return res.json();
}

export async function releaseGrades(courseId) {
  const res = await fetch(`/api/grades/${courseId}/release`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to release grades");
  return res.json();
}

export async function recalculateGrades(courseId) {
  const res = await fetch(`/api/grades/${courseId}/recalculate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to recalculate grades");
  return res.json();
}
