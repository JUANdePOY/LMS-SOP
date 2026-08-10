import api from '../../../lib/api';
import { validateId, sanitizeSearchQuery, validatePagination } from '../../organization-management/utils/validation';

export const getCategories = (params = {}) => {
  const { sanitized } = validatePagination(params);
  const search = params.query ? sanitizeSearchQuery(params.query) : '';
  return api.get('/categories', { params: { ...sanitized, search, ...params } });
};

export const getCategory = (id) => {
  const err = validateId(id, 'Category ID');
  if (err) return Promise.reject(new Error(err));
  return api.get(`/categories/${id}`);
};

export const createCategory = (data) => api.post('/categories', data);

export const updateCategory = (id, data) => {
  const err = validateId(id, 'Category ID');
  if (err) return Promise.reject(new Error(err));
  return api.put(`/categories/${id}`, data);
};

export const deleteCategory = (id) => {
  const err = validateId(id, 'Category ID');
  if (err) return Promise.reject(new Error(err));
  return api.delete(`/categories/${id}`);
};