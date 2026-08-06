import * as session from '@/services/session';

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handle(res) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      const error = new Error(json?.message || json?.error || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.code = json?.code;
      error.response = { data: json };
      throw error;
    }
    return json;
  } catch {
    if (!res.ok) {
      const error = new Error(text || res.statusText);
      error.status = res.status;
      throw error;
    }
    return {};
  }
}

export async function getCourseProgress(courseId) {
  const res = await fetch(`/api/courses/${courseId}/progress`, { headers: authHeaders() });
  return handle(res);
}

export async function markLessonComplete(lessonId) {
  const res = await fetch(`/api/lessons/${lessonId}/complete`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handle(res);
}

export async function enrollInCourse(courseId) {
  const user = session.getCurrentUser();
  const userId = user?.id;
  if (!userId) throw new Error("User not authenticated");
  const res = await fetch(`/api/courses/${courseId}/enroll`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ course_id: courseId, user_id: userId }),
  });
  return handle(res);
}

export async function getEnrollmentStatus(courseId) {
  const res = await fetch(`/api/courses/${courseId}/enrollment-status`, { headers: authHeaders() });
  return handle(res);
}
