import api from '@/lib/api';

const base = '/sops/assignment';
const assignmentsBase = '/sops';

export const fetchBusinesses = () => api.get('/businesses');
export const fetchDepartments = () => api.get(`${base}/departments`);

export const fetchPositions = (departmentId) =>
  api.get(`${base}/positions/${departmentId}`);

export const fetchUsers = (departmentId, params = {}) =>
  api.get(`${base}/users/${departmentId}`, { params });

export const fetchAssigned = (sopId) =>
  api.get(`${assignmentsBase}/${sopId}/assigned`);

export const createAssignment = (sopId, data) =>
  api.post(`${assignmentsBase}/${sopId}/assignments`, data);

export const deleteAssignment = (assignmentId) =>
  api.delete(`${assignmentsBase}/assignments/${assignmentId}`);

export default {
  fetchDepartments,
  fetchPositions,
  fetchUsers,
  fetchAssigned,
  createAssignment,
  deleteAssignment,
};
