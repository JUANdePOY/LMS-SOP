import axios from 'axios';

const API_BASE = '/api';

// Create axios instance with auth header support
const api = axios.create({
  baseURL: API_BASE,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ARCENs
export const getArcens = (params = {}) => api.get('/arsens', { params });
export const getArcen = (id) => api.get(`/arsens/${id}`);
export const createArcen = (data) => api.post('/arsens', data);
export const updateArcen = (id, data) => api.put(`/arsens/${id}`, data);
export const deleteArcen = (id) => api.delete(`/arsens/${id}`);
export const getArcenGroups = (id, params = {}) => api.get(`/arsens/${id}/groups`, { params });

// Groups
export const getGroups = (params = {}) => api.get('/groups', { params });
export const getGroup = (id) => api.get(`/groups/${id}`);
export const createGroup = (data) => api.post('/groups', data);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);
export const getGroupSquadrons = (id, params = {}) => api.get(`/groups/${id}/squadron`, { params });

// Squadrons
export const getSquadrons = (params = {}) => api.get('/squadron', { params });
export const getSquadron = (id) => api.get(`/squadron/${id}`);
export const createSquadron = (data) => api.post('/squadron', data);
export const updateSquadron = (id, data) => api.put(`/squadron/${id}`, data);
export const deleteSquadron = (id) => api.delete(`/squadron/${id}`);

// Hierarchy endpoint
export const getHierarchy = () => api.get('/hierarchy');

export default api;