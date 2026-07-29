export function formatCourseCode(code) {
  if (!code) return "";
  return String(code).toUpperCase().replace(/\s+/g, "-");
}

export function generateCourseSlug(title) {
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function sortContentByOrder(contentList) {
  return [...contentList].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function calculateContentDuration(contents) {
  return contents.reduce((total, item) => total + (item.duration || 0), 0);
}

export function getEnrollmentCount(enrollments) {
  return enrollments?.filter((e) => e.status === "active").length || 0;
}
