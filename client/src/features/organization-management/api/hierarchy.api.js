import api from '../../../lib/api';

export const getOrganizationHierarchy = () => api.get('/hierarchy');

export const getDepartmentSops = (departmentId) =>
  api.get('/sops', { params: { department_id: departmentId } });
