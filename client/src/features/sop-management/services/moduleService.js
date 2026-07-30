import api from '@/lib/api';

export const getModules = (sopId) => api.get(`/sops/${sopId}/modules`);
export const createModule = (sopId, data) => api.post(`/sops/${sopId}/modules`, data);
export const updateModule = (moduleId, data) => api.put(`/sops/modules/${moduleId}`, data);
export const deleteModule = (moduleId) => api.delete(`/sops/modules/${moduleId}`);
export const restoreModule = (moduleId) => api.post(`/sops/modules/${moduleId}/restore`);
export const permanentDeleteModule = (moduleId) => api.delete(`/sops/modules/${moduleId}/permanent`);
export const getTrashedModules = (sopId) => api.get(`/sops/${sopId}/modules/trashed`);
export const updateSortOrder = (sopId, moduleOrders) => api.put(`/sops/${sopId}/modules/sort`, { moduleOrders });
export const submitForReview = (moduleId) =>
  api.put(`/sops/modules/${moduleId}/transition`, { status: 'In Review' });