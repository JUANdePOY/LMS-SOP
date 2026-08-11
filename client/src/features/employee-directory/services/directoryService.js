import { getUsers, getUser } from "@/services/api";

export async function fetchEmployees(params = {}) {
  const res = await getUsers({
    search: params.search || undefined,
    department_id: params.department_id || undefined,
    page: params.page || 1,
    limit: params.limit || 24,
  });
  const payload = res.data?.data || {};
  return {
    employees: Array.isArray(payload.rows) ? payload.rows : [],
    total: payload.total || 0,
    page: payload.page || 1,
    limit: payload.limit || 24,
    totalPages: payload.totalPages || 1,
  };
}

export async function fetchEmployee(id) {
  const res = await getUser(id);
  return res.data?.data || null;
}
