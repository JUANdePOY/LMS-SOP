import api from '../../../lib/api';

export const getShares = (sopId) => api.get(`/sops/${sopId}/shares`);
export const createShare = (sopId, data) => api.post(`/sops/${sopId}/shares`, data);
