import api from '@/services/api';

export const getClients = () => api.get('/clients');
export const getClientOptions = () => api.get('/clients/options');
export const getClient = (id) => api.get(`/clients/${id}`).then((r) => r.data?.data);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data).then((r) => r.data?.data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);
