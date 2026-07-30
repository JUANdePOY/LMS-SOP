import api from '../../../lib/api';
import { validateId, sanitizeSearchQuery, validatePagination } from '../../organization-management/utils/validation';

export const getBusinesses = (params = {}) => {
  const { sanitized } = validatePagination(params);
  const query = params.query ? sanitizeSearchQuery(params.query) : '';
  return api.get('/businesses', { params: { ...sanitized, query, ...params } });
};

export const getBusiness = (id) => {
  const err = validateId(id, 'Business ID');
  if (err) return Promise.reject(new Error(err));
  return api.get(`/businesses/${id}`);
};

export const createBusiness = (data) => api.post('/businesses', data);

export const updateBusiness = (id, data) => {
  const err = validateId(id, 'Business ID');
  if (err) return Promise.reject(new Error(err));
  return api.put(`/businesses/${id}`, data);
};

export const deleteBusiness = (id) => {
  const err = validateId(id, 'Business ID');
  if (err) return Promise.reject(new Error(err));
  return api.delete(`/businesses/${id}`);
};

export const getBusinessHierarchy = () => api.get('/businesses/hierarchy');

export const uploadBusinessLogo = (businessId, formData) => {
  const err = validateId(businessId, 'Business ID');
  if (err) return Promise.reject(new Error(err));
  return api.post(`/businesses/${businessId}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteBusinessLogo = (businessId) => {
  const err = validateId(businessId, 'Business ID');
  if (err) return Promise.reject(new Error(err));
  return api.delete(`/businesses/${businessId}/logo`);
};

export const getBusinessLogo = (businessId) => {
  const err = validateId(businessId, 'Business ID');
  if (err) return Promise.reject(new Error(err));
  return api.get(`/businesses/${businessId}/logo`, {
    responseType: 'blob',
  });
};
