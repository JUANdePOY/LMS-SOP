import api from '@/services/api';

export async function getUsersForAssignment(query = '') {
  const res = await api.get('/users', {
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
