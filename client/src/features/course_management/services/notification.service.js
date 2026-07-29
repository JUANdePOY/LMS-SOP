export async function sendAnnouncement(courseId, payload) {
  const res = await fetch(`/api/courses/${courseId}/announcements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to send announcement");
  return res.json();
}

export async function notifyStudents(courseId, message) {
  const res = await fetch(`/api/courses/${courseId}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Failed to notify students");
  return res.json();
}
