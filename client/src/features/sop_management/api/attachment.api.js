import api from '../../../lib/api';

export const getAttachments = (sopId) => api.get(`/sops/${sopId}/attachments`);
export const uploadAttachment = (sopId, formData) => api.post(`/sops/${sopId}/attachments`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteAttachment = (attachmentId) => api.delete(`/sops/attachments/${attachmentId}`);
