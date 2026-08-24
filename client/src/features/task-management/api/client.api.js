import api from '@/services/api';

export const getClients = () => api.get('/clients');
export const getClientOptions = () => api.get('/clients/options');
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);
