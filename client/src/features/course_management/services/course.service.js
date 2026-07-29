export async function getCourseSummary(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`/api/courses/summary?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch course summary");
  return res.json();
}

export async function getCourseProgressSummary(courseId) {
  const res = await fetch(`/api/courses/${courseId}/progress-summary`);
  if (!res.ok) throw new Error("Failed to fetch progress summary");
  return res.json();
}

export async function getCourseGradesSummary(courseId) {
  const res = await fetch(`/api/courses/${courseId}/grades-summary`);
  if (!res.ok) throw new Error("Failed to fetch grades summary");
  return res.json();
}
