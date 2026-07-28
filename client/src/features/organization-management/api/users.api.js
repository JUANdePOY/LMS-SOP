import api from '../../../lib/api';

export const getUsers = (params = {}) => api.get('/users', { params });
