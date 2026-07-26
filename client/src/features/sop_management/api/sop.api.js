import api from '../../../lib/api';

export const getSops = (params = {}) => api.get('/sops', { params });
export const getSop = (id) => api.get(`/sops/${id}`);
export const createSop = (data) => api.post('/sops', data);
export const updateSop = (id, data) => api.put(`/sops/${id}`, data);
export const deleteSop = (id) => api.delete(`/sops/${id}`);
export const getSopStats = () => api.get('/sops/stats');

// List query params follow the standard convention from constants/pagination.js:
// getSops({ page: 1, limit: 20, sort: '-created_at', search: 'safety', status: 'Draft', department_id: 3 })