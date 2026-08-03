import api from '@/lib/api';

export const getAttachments = (moduleId) => api.get(`/sops/modules/${moduleId}/attachments`);
export const uploadAttachment = (moduleId, formData) => api.post(`/sops/modules/${moduleId}/attachments`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const createLink = (moduleId, linkData) => api.post(`/sops/modules/${moduleId}/links`, linkData);
export const deleteAttachment = (attachmentId) => api.delete(`/sops/attachments/${attachmentId}`);
export const restoreAttachment = (attachmentId) => api.post(`/sops/attachments/${attachmentId}/restore`);
export const permanentDeleteAttachment = (attachmentId) => api.delete(`/sops/attachments/${attachmentId}/permanent`);
export const getTrashedAttachments = (moduleId) => api.get(`/sops/modules/${moduleId}/attachments/trashed`);