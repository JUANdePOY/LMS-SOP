import axios from 'axios';

// Use environment variable for API base URL, fallback to relative path
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with auth header support
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ((error.response?.status === 401 || error.response?.status === 403) && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please check your connection.';
    }
    return Promise.reject(error);
  }
);

// Authentication endpoints
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => api.post('/auth/logout');
export const getProfile = () => api.get('/auth/profile');

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Reservists
export const getReservists = (params = {}) => api.get('/reservists', { params });
export const getReservist = (id) => api.get(`/reservists/${id}`);
export const createReservist = (data) => api.post('/reservists', data);
export const updateReservist = (id, data) => api.put(`/reservists/${id}`, data);
export const deleteReservist = (id) => api.delete(`/reservists/${id}`);
export const assignReservist = (id, data) => api.post(`/reservists/${id}/assign`, data);
export const resetReservistPassword = (id, data) => api.post(`/reservists/${id}/reset-password`, data);
export const bulkUploadReservists = (formData) => 
  api.post('/reservists/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const bulkPreviewReservists = (formData) =>
  api.post('/reservists/bulk-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

// Trainings
export const getTrainings = (params = {}) => api.get('/trainings', { params });
export const getTraining = (id) => api.get(`/trainings/${id}`);
export const createTraining = (data) => api.post('/trainings', data);
export const updateTraining = (id, data) => api.put(`/trainings/${id}`, data);
export const deleteTraining = (id) => api.delete(`/trainings/${id}`);

// Attendance
export const getAttendance = (params = {}) => api.get('/attendance', { params });
export const getAttendanceRecord = (id) => api.get(`/attendance/${id}`);
export const createAttendance = (data) => api.post('/attendance', data);
export const updateAttendance = (id, data) => api.put(`/attendance/${id}`, data);

// Readiness
export const getReadiness = (params = {}) => api.get('/readiness', { params });

// Supplies
export const getSupplies = (params = {}) => api.get('/supplies', { params });
export const getSupply = (id) => api.get(`/supplies/${id}`);
export const createSupply = (data) => api.post('/supplies', data);
export const updateSupply = (id, data) => api.put(`/supplies/${id}`, data);
export const deleteSupply = (id) => api.delete(`/supplies/${id}`);
export const getLowStockSupplies = () => api.get('/supplies/low-stock');
export const getSupplyCategories = () => api.get('/supplies/categories');
export const adjustSupplyStock = (data) => api.post('/supplies/adjust-stock', data);

// Areas
export const getAreas = (params = {}) => api.get('/areas', { params });
export const getArea = (id) => api.get(`/areas/${id}`);

// Groups
export const getGroups = (params = {}, config = {}) => api.get('/hierarchy', { params, ...config });

// ARSENs
export const getArcens = (params = {}) => api.get('/arsens', { params });
export const getArsen = (id) => api.get(`/arsens/${id}`);
export const createArsen = (data) => api.post('/arsens', data);
export const updateArsen = (id, data) => api.put(`/arsens/${id}`, data);
export const deleteArsen = (id) => api.delete(`/arsens/${id}`);

// Groups (management)
export const getGroupsList = (params = {}) => api.get('/groups', { params });
export const getGroup = (id) => api.get(`/groups/${id}`);
export const createGroup = (data) => api.post('/groups', data);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);

// Squadrons (management)
export const getSquadrons = (params = {}) => api.get('/squadron', { params });
export const getSquadron = (id) => api.get(`/squadron/${id}`);
export const createSquadron = (data) => api.post('/squadron', data);
export const updateSquadron = (id, data) => api.put(`/squadron/${id}`, data);
export const deleteSquadron = (id) => api.delete(`/squadron/${id}`);

export default api;