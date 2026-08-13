import * as session from '@/services/session';
import api from '@/services/api';

const API_BASE = '/enrollments';

export async function getEnrollments(params = {}) {
  try {
    const res = await api.get(API_BASE, { params });
    return res.data;
  } catch (err) {
    console.error('[Enrollment API] getEnrollments failed:', err);
    throw err;
  }
}

export async function enrollStudent(payload) {
  const res = await api.post(API_BASE, payload);
  return res.data;
}

export async function bulkEnrollStudents(payload) {
  const res = await api.post(`${API_BASE}/bulk`, payload);
  return res.data;
}

export async function unenrollStudent(enrollmentId) {
  const res = await api.delete(`${API_BASE}/${enrollmentId}`);
  return res.data;
}

export async function getEnrollmentDetails(enrollmentId) {
  const res = await api.get(`${API_BASE}/${enrollmentId}`);
  return res.data;
}

export async function updateEnrollmentStatus(enrollmentId, status) {
  const res = await api.patch(`${API_BASE}/${enrollmentId}/status`, { status });
  return res.data;
}
