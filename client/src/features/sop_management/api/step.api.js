import api from '../../../lib/api';

export const getSteps = (sopId) => api.get(`/sops/${sopId}/steps`);
export const createStep = (sopId, data) => api.post(`/sops/${sopId}/steps`, data);
export const updateStep = (stepId, data) => api.put(`/sops/steps/${stepId}`, data);
export const deleteStep = (stepId) => api.delete(`/sops/steps/${stepId}`);
