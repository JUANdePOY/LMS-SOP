import api from '@/services/api';

export const getClients = () => api.get('/clients');
export const getClientOptions = () => api.get('/clients/options');
export const getClient = (id) => api.get(`/clients/${id}`).then((r) => r.data?.data);
export const getClientBusiness = (clientId, businessId) =>
  api.get(`/clients/${clientId}/businesses/${businessId}`).then((r) => r.data?.data);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data).then((r) => r.data?.data);
export const updateClientBusiness = (clientId, businessId, data) =>
  api.put(`/clients/${clientId}/businesses/${businessId}`, data).then((r) => r.data?.data);
export const deleteClient = (id) => {
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) {
    return Promise.reject(new Error(`Invalid client ID: ${id}`));
  }
  return api.delete(`/clients/${numId}`);
};
export const deleteClientBusiness = (clientId, businessId) => {
  const numClientId = Number(clientId);
  const numBusinessId = Number(businessId);
  if (!Number.isFinite(numClientId) || numClientId <= 0) {
    return Promise.reject(new Error(`Invalid client ID: ${clientId}`));
  }
  if (!Number.isFinite(numBusinessId) || numBusinessId <= 0) {
    return Promise.reject(new Error(`Invalid business ID: ${businessId}`));
  }
  return api.delete(`/clients/${numClientId}/businesses/${numBusinessId}`);
};

export const bulkUploadClients = (file, format, businessId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);
  if (businessId != null) formData.append('business_id', String(businessId));
  return api.post('/clients/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
