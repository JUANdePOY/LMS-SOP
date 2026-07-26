import api from '../../../lib/api';

export const getApprovals = (sopId) => api.get(`/sops/${sopId}/approvals`);
export const createApproval = (sopId, data) => api.post(`/sops/${sopId}/approvals`, data);
export const updateApproval = (approvalId, data) => api.put(`/sops/approvals/${approvalId}`, data);
