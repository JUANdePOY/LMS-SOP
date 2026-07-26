import api from '../../../lib/api';

export const getAssignments = (sopId) => api.get(`/sops/${sopId}/assignments`);

export const createAssignment = (sopId, data) => api.post(`/sops/${sopId}/assignments`, data);

export const deleteAssignment = (assignmentId) => api.delete(`/sops/assignments/${assignmentId}`);
