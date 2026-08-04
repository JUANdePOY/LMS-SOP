import api from '../../../lib/api';
import { validateId, sanitizeSearchQuery, validatePagination } from '../utils/validation';

export const getDepartments = (params = {}) => {
  const { sanitized } = validatePagination(params);
  const query = params.query ? sanitizeSearchQuery(params.query) : '';
  return api.get('/departments', { params: { ...sanitized, query, ...params } });
};

export const getDepartment = (id) => {
  const err = validateId(id, 'Department ID');
  if (err) return Promise.reject(new Error(err));
  return api.get(`/departments/${id}`);
};

export const createDepartment = (data) => api.post('/departments', data);

export const updateDepartment = (id, data) => {
  const err = validateId(id, 'Department ID');
  if (err) return Promise.reject(new Error(err));
  return api.put(`/departments/${id}`, data);
};

export const deleteDepartment = (id) => {
  const err = validateId(id, 'Department ID');
  if (err) return Promise.reject(new Error(err));
  return api.delete(`/departments/${id}`);
};

export const getDepartmentTree = () => api.get('/departments/tree');

