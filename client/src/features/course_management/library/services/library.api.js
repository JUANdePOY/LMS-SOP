import { getCourseList, getCourseById } from "@/features/course_management/api/course.api";
import { getEnrollments, enrollStudent, bulkEnrollStudents } from "@/features/course_management/api/enrollment.api";

import * as session from '@/services/session';

function authHeaders() {
  const token = session.getCurrentToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function getPublishedCourses(params = {}) {
  return await getCourseList({ ...params, status: "published" });
}

export async function getCourseLibraryDetails(courseId) {
  return await getCourseById(courseId);
}

export async function enrollInCourse(courseId, payload = {}) {
  return await enrollStudent({ course_id: courseId, ...payload });
}

export async function getCourseEnrollments(courseId, params = {}) {
  return await getEnrollments({ ...params, course_id: courseId, page: 1, limit: 100 });
}

export async function getCourseProgress(courseId) {
  const res = await fetch(`/api/enrollments/course/${courseId}/progress`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch course progress");
  return res.json();
}

export async function getCourseAnalytics(courseId) {
  try {
    const res = await getCourseProgress(courseId);
    const progressData = res.data || res || [];
    const totalEnrollments = progressData.length || 0;
    const completedCount = progressData.filter((p) => (p.progress_percentage || 0) >= 100).length;
    const avgProgress = totalEnrollments > 0
      ? progressData.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / totalEnrollments
      : 0;
    return {
      data: {
        total_enrollments: totalEnrollments,
        completed_count: completedCount,
        avg_progress: avgProgress,
        active_learners: progressData.filter((p) => (p.progress_percentage || 0) > 0 && (p.progress_percentage || 0) < 100).length,
        completion_rate: totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0,
      },
    };
  } catch (err) {
    return { data: null };
  }
}

export async function assignEmployees(courseId, userIds) {
  return await bulkEnrollStudents({ course_id: courseId, user_ids: userIds, role: "learner" });
}
