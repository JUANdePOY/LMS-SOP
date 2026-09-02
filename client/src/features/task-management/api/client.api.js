import api from '@/services/api';

export const getClients = () => api.get('/clients');
export const getClientOptions = () => api.get('/clients/options');
export const getClient = (id) => api.get(`/clients/${id}`).then((r) => r.data?.data);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data).then((r) => r.data?.data);
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
