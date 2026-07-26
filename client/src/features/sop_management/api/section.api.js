import api from '../../../lib/api';

export const getSections = (sopId) => api.get(`/sops/${sopId}/sections`);
export const createSection = (sopId, data) => api.post(`/sops/${sopId}/sections`, data);
export const updateSection = (sectionId, data) => api.put(`/sops/sections/${sectionId}`, data);
export const deleteSection = (sectionId) => api.delete(`/sops/sections/${sectionId}`);
