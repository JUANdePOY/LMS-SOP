import api from '@/lib/api';

export const getVersions = (sopId) => api.get(`/sops/${sopId}/versions`);
export const createVersion = (sopId, data) => api.post(`/sops/${sopId}/versions`, data);
export const restoreVersion = (sopId, versionId) => api.post(`/sops/${sopId}/versions/${versionId}/restore`);