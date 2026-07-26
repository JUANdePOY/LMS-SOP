import api from '../../../lib/api';

export const getAcknowledgements = (sopId, params = {}) => api.get(`/sops/${sopId}/acknowledgements`, { params });

export const getPendingAcknowledgements = (sopId) => api.get(`/sops/${sopId}/acknowledgements/pending`);

export const getAcknowledgementStats = (sopId) => api.get(`/sops/${sopId}/acknowledgements/stats`);

export const getMyAcknowledgements = (params = {}) => api.get('/sops/me/acknowledgements', { params });

export const createAcknowledgement = (sopId, data) => api.post(`/sops/${sopId}/acknowledgements`, data);

export const acknowledgeSop = (sopId) => api.post(`/sops/${sopId}/acknowledgements/acknowledge`);
