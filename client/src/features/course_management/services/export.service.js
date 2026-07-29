export async function exportGradesCSV(courseId) {
  const res = await fetch(`/api/courses/${courseId}/export/csv`);
  if (!res.ok) throw new Error("Failed to export grades");
  return res.blob();
}

export async function exportEnrollmentsExcel(courseId) {
  const res = await fetch(`/api/courses/${courseId}/export/excel`);
  if (!res.ok) throw new Error("Failed to export enrollments");
  return res.blob();
}

export async function exportCoursePDF(courseId) {
  const res = await fetch(`/api/courses/${courseId}/export/pdf`);
  if (!res.ok) throw new Error("Failed to export course");
  return res.blob();
}
