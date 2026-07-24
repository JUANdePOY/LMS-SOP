import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if ((status === 401 || status === 403) && code && ['NO_TOKEN', 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'ACCOUNT_DEACTIVATED', 'USER_NOT_FOUND'].includes(code) && !error.config?.skipAuthRedirect) {
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

export const login = (credentials) => api.post('/auth/login', credentials, { skipAuthRedirect: true });
export const logout = () => api.post('/auth/logout');
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data, { skipAuthRedirect: true });
export const changePassword = (data) => api.put('/auth/profile/password', data, { skipAuthRedirect: true });

export const getDashboard = (params = {}) => api.get('/dashboard', { params });

export const getUsers = (params = {}) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const updateUserPassword = (id, data) => api.put(`/users/${id}/password`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getUserStats = () => api.get('/users/stats');

export const getDepartments = (params = {}) => api.get('/departments', { params });
export const getDepartmentHierarchy = () => api.get('/departments/hierarchy');
export const getDepartment = (id) => api.get(`/departments/${id}`);
export const createDepartment = (data) => api.post('/departments', data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);
export const getDepartmentUsers = (id) => api.get(`/departments/${id}/users`);

export const getRoles = (params = {}) => api.get('/roles', { params });
export const getRole = (id) => api.get(`/roles/${id}`);
export const createRole = (data) => api.post('/roles', data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}`);
export const getPermissions = () => api.get('/roles/permissions');
export const updateRolePermissions = (roleName, permission_names) => api.put(`/roles/permissions/${roleName}`, { permission_names });

export const getSettings = () => api.get('/settings');
export const createSetting = (data) => api.post('/settings', data);
export const updateSetting = (key, data) => api.put(`/settings/${key}`, data);

export default api;