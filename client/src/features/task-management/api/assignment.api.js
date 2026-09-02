import api from '@/services/api';

export async function getUsersForAssignment(query = '', departmentId = null) {
  const params = {
    search: query,
    page: 1,
    limit: 20,
  };
  if (departmentId != null) {
    params.department_id = departmentId;
  }
  const res = await api.get('/users', { params });
  const payload = res.data;
  const rows = payload?.data?.rows || payload?.data || [];
  return Array.isArray(rows) ? rows : [];
}

export async function getDepartmentsForAssignment(query = '') {
  const res = await api.get('/departments', {
    params: {
      search: query,
      page: 1,
      limit: 20,
    },
  });
  const payload = res.data;
  const rows = payload?.data?.rows || payload?.data || [];
  return Array.isArray(rows) ? rows : [];
}

// Returns the current user's role + scope so the AssigneePicker can adapt its
// UI (placeholder text) and the backend can enforce assignment boundaries.
export async function getAssignmentScope() {
  const res = await api.get('/users/me');
  const payload = res.data;
  const user = payload?.data || {};
  return {
    role: user.role || null,
    department_id: user.department_id ?? null,
    business_id: user.business_id ?? null,
  };
}
