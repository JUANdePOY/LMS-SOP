import api from '@/lib/api';

export const getSops = (params = {}) => api.get('/sops', { params });
export const getSop = (id) => api.get(`/sops/${id}`);
export const createSop = (data) => api.post('/sops', data);
export const updateSop = (id, data) => api.put(`/sops/${id}`, data);
export const deleteSop = (id) => api.delete(`/sops/${id}`);
export const getSopStats = () => api.get('/sops/stats');

export const getTrashedSops = (params = {}) => api.get('/sops/trashed', { params });
export const restoreSop = (id) => api.post(`/sops/${id}/restore`);
export const permanentDeleteSop = (id) => api.delete(`/sops/${id}/permanent`);
export const emptyTrash = () => api.delete('/sops/trashed/empty');

export const getAssignments = (sopId) => api.get(`/sops/${sopId}/assignments`);
export const createAssignment = (sopId, data) => api.post(`/sops/${sopId}/assignments`, data);
export const deleteAssignment = (assignmentId) => api.delete(`/sops/assignments/${assignmentId}`);

export const getAcknowledgements = (sopId, params = {}) => api.get(`/sops/${sopId}/acknowledgements`, { params });
export const createAcknowledgement = (sopId, data) => api.post(`/sops/${sopId}/acknowledgements`, data);
export const acknowledgeSop = (sopId) => api.post(`/sops/${sopId}/acknowledgements/acknowledge`);

export const getShares = (sopId) => api.get(`/sops/${sopId}/shares`);
export const getShareLinks = getShares;
export const createShare = (sopId, data) => api.post(`/sops/${sopId}/shares`, data);
export const createShareLink = (sopId, data) => api.post(`/sops/${sopId}/shares/link`, data);
export const revokeShareLink = (sopId, shareId) => api.delete(`/sops/${sopId}/shares/${shareId}`);

export const getSharedSop = (token) => api.get(`/sops/share/${token}`);

export const getAuditLogs = (sopId) => api.get(`/sops/${sopId}/audit`);

export const getWorkflow = (sopId) => api.get(`/sops/${sopId}/workflow`);
export const startWorkflow = (sopId) => api.post(`/sops/${sopId}/workflow/start`);

export const submitSop = (sopId) => api.post(`/sops/${sopId}/submit`);
export const approveSop = (sopId) => api.post(`/sops/${sopId}/approve`);
export const rejectSop = (sopId) => api.post(`/sops/${sopId}/reject`);
export const publishSop = (sopId) => api.post(`/sops/${sopId}/publish`);

export const archiveSop = (sopId) => api.put(`/sops/${sopId}`, { status: 'Archived' });
export const unarchiveSop = (sopId) => api.put(`/sops/${sopId}`, { status: 'Draft' });

export const transitionSop = (sopId, data) => api.post(`/sops/${sopId}/transition`, data);
export const getSharedSopModules = (token, versionId = null) =>
  api.get(`/sops/share/${token}/modules${versionId ? `?versionId=${versionId}` : ''}`);
