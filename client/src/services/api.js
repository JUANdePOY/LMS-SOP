import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
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

export const request = (url, options = {}) => {
  const { method = 'GET', body } = options;
  const config = { method, ...(body && { data: body, headers: { 'Content-Type': 'application/json' } }) };
  return api(url, config);
};

export const login = (credentials) => api.post('/auth/login', credentials, { skipAuthRedirect: true });
export const logout = () => api.post('/auth/logout');
export const getProfile = () => api.get('/auth/profile', { skipAuthRedirect: true });
export const updateProfile = (data) => api.put('/auth/profile', data, { skipAuthRedirect: true });
export const changePassword = (data) => api.put('/auth/profile/password', data, { skipAuthRedirect: true });
export const uploadAvatar = (formData) => api.post('/auth/profile/avatar', formData, {
  skipAuthRedirect: true,
});
export const deleteAvatar = () => api.delete('/auth/profile/avatar', { skipAuthRedirect: true });

export const getDashboard = (params = {}) => api.get('/dashboard', { params });

export const getUsers = (params = {}) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const updateUserPassword = (id, data) => api.put(`/users/${id}/password`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getUserStats = () => api.get('/users/stats');
export const bulkUploadUsers = (formData) => api.post('/users/bulk-upload', formData);

export const getDepartments = (params = {}) => api.get('/departments', { params });
export const getDepartmentHierarchy = () => api.get('/departments/hierarchy');
export const getDepartment = (id) => api.get(`/departments/${id}`);
export const createDepartment = (data) => api.post('/departments', data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);
export const getDepartmentUsers = (id) => api.get(`/departments/${id}/users`);

export const getCategories = (params = {}) => api.get('/categories', { params });
export const getCategory = (id) => api.get(`/categories/${id}`);

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

export const getCourses = (params = {}) => api.get('/courses', { params });
export const getCourse = (id) => api.get(`/courses/${id}`);
export const createCourse = (data) => api.post('/courses', data);
export const updateCourse = (id, data) => api.put(`/courses/${id}`, data);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);
export const publishCourse = (id) => api.patch(`/courses/${id}/publish`);
export const archiveCourse = (id) => api.patch(`/courses/${id}/archive`);
export const getCourseModules = (courseId, params = {}) => api.get(`/courses/${courseId}/modules`, { params });
export const createCourseModule = (courseId, data) => api.post(`/courses/${courseId}/modules`, data);
export const updateCourseModule = (courseId, moduleId, data) => api.put(`/courses/${courseId}/modules/${moduleId}`, data);
export const deleteCourseModule = (courseId, moduleId) => api.delete(`/courses/${courseId}/modules/${moduleId}`);
export const getCourseContent = (courseId, moduleId, params = {}) => api.get(`/courses/${courseId}/modules/${moduleId}/content`, { params });
export const createCourseContent = (courseId, moduleId, data) => api.post(`/courses/${courseId}/modules/${moduleId}/content`, data);
export const updateCourseContent = (courseId, moduleId, contentId, data) => api.put(`/courses/${courseId}/modules/${moduleId}/content/${contentId}`, data);
export const deleteCourseContent = (courseId, moduleId, contentId) => api.delete(`/courses/${courseId}/modules/${moduleId}/content/${contentId}`);

export default api;