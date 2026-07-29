const API_BASE = "/api/analytics";

export async function getCourseAnalytics(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function getInstructorDashboard() {
  const res = await fetch(`${API_BASE}/instructor`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function getLearnerDashboard() {
  const res = await fetch(`${API_BASE}/learner`);
  if (!res.ok) throw new Error("Failed to fetch learner dashboard");
  return res.json();
}

export async function getEnrollmentTrends(courseId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}/courses/${courseId}/enrollment-trends?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch enrollment trends");
  return res.json();
}

export async function getCompletionRates(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/completion-rates`);
  if (!res.ok) throw new Error("Failed to fetch completion rates");
  return res.json();
}

export async function getGradeDistribution(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/grade-distribution`);
  if (!res.ok) throw new Error("Failed to fetch grade distribution");
  return res.json();
}

export async function exportReport(courseId, type) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/export?type=${type}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to export report");
  return res.json();
}
