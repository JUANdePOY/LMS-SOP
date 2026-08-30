import api from '@/services/api';

export const getBusinesses = async () => {
  const res = await api.get('/businesses');
  const payload = res.data?.data;
  return Array.isArray(payload) ? payload : (payload?.rows || []);
};

export const getBusiness = (id) =>
  api.get(`/businesses/${id}`).then((r) => r.data?.data);

export const createBusiness = (clientId, data) =>
  api.post(`/clients/${clientId}/businesses`, data).then((r) => r.data?.data);

export const updateBusiness = (id, data) =>
  api.put(`/businesses/${id}`, data).then((r) => r.data?.data);

export const deleteBusiness = (id, force = false) =>
  api.delete(`/businesses/${id}`, { data: { force } }).then((r) => r.data);
