import { getCourseList, getCourseById } from "@/features/course_management/api/course.api";
import { getEnrollments, enrollStudent } from "@/features/course_management/api/enrollment.api";
import { getCourseProgress, getEnrollmentStatus } from "@/features/course_management/services/lesson-progress.service";
import * as session from '@/services/session';

export async function getMyEnrollments(params = {}) {
  const res = await getEnrollments({ ...params, limit: 100 });
  return res;
}

export async function getPublishedCoursesForEmployee(params = {}) {
  return await getCourseList({ ...params, status: "published" });
}

export async function getEmployeeCourseDetails(courseId) {
  return await getCourseById(courseId);
}

export async function getEmployeeCourseProgress(courseId) {
  return await getCourseProgress(courseId);
}

export async function getEmployeeEnrollmentStatus(courseId) {
  return await getEnrollmentStatus(courseId);
}

export async function getEmployeeEnrollmentsWithCourses(params = {}) {
  const enrollmentsRes = await getEnrollments({ ...params, limit: 100 });
  const enrollments = enrollmentsRes?.data?.rows || enrollmentsRes?.data || [];
  const courseIds = enrollments
    .map((e) => e.course_id)
    .filter((id) => id !== undefined && id !== null);
  const uniqueCourseIds = [...new Set(courseIds)];

  if (uniqueCourseIds.length === 0) {
    return { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 1 } };
  }

  const coursesRes = await Promise.all(
    uniqueCourseIds.map((id) =>
      getCourseById(id).catch(() => null)
    )
  );

  const courseMap = new Map();
  coursesRes.forEach((res) => {
    if (res?.data) {
      courseMap.set(res.data.id, res.data);
    }
  });

  const enrichedEnrollments = enrollments.map((enrollment) => ({
    ...enrollment,
    course: courseMap.get(enrollment.course_id) || null,
  }));

  return {
    data: enrichedEnrollments,
    pagination: enrollmentsRes?.pagination || { page: 1, limit: 100, total: enrichedEnrollments.length, totalPages: 1 },
  };
}

export async function enrollInCourse(courseId) {
  const storedUser = session.getCurrentUser();
  const userId = storedUser ? storedUser.id : null;
  return await enrollStudent({ course_id: courseId, user_id: userId });
}
