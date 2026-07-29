import api from '../../../lib/api';

export const getBusinesses = (params = {}) => api.get('/businesses', { params });
export const getBusiness = (id) => api.get(`/businesses/${id}`);
export const createBusiness = (data) => api.post('/businesses', data);
export const updateBusiness = (id, data) => api.put(`/businesses/${id}`, data);
export const deleteBusiness = (id) => api.delete(`/businesses/${id}`);
export const getBusinessHierarchy = () => api.get('/businesses/hierarchy');
export const uploadBusinessLogo = (formData) =>
  api.post('/businesses/upload-logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
