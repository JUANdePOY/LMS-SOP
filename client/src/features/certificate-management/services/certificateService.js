import api from '@/services/api';

export const getCertificateTemplates = (params = {}) =>
  api.get('/certificate-templates', { params });

export const getCertificateTemplate = (id) =>
  api.get(`/certificate-templates/${id}`);

export const createCertificateTemplate = (formData) =>
  api.post('/certificate-templates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateCertificateTemplate = (id, formData) =>
  api.put(`/certificate-templates/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteCertificateTemplate = (id) =>
  api.delete(`/certificate-templates/${id}`);

export const getCertificateTemplateStats = () =>
  api.get('/certificate-templates/stats');

export const getSignatures = (params = {}) =>
  api.get('/certificate-signatures', { params });

export const getSignature = (id) =>
  api.get(`/certificate-signatures/${id}`);

export const createSignature = (formData) =>
  api.post('/certificate-signatures', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateSignature = (id, data) =>
  api.put(`/certificate-signatures/${id}`, data);

export const deleteSignature = (id) =>
  api.delete(`/certificate-signatures/${id}`);

export const issueCertificate = (data) =>
  api.post('/certificate-issuances', data);

export const getIssuancesByUser = (userId, params = {}) =>
  api.get(`/certificate-issuances/user/${userId}`, { params });

export const getIssuanceByCertificateNumber = (certificateNumber) =>
  api.get(`/certificate-issuances/${certificateNumber}`);

export const revokeIssuance = (id) =>
  api.delete(`/certificate-issuances/${id}/revoke`);
